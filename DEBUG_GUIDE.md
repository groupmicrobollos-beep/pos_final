# Guía de Debugging - Autenticación

## Problemas Conocidos
- Usuarios admin no se reconocen después del login
- Se recibe HTML en lugar de JSON desde endpoints de autenticación

## Pasos de Diagnóstico

### 1. Verificar que hay usuarios en la base de datos

**Sin autenticación requerida:**
```
GET /api/auth/debug-users
```

Respuesta esperada:
```json
{
  "userCount": 1,
  "users": [
    {
      "id": "usr_1234567890",
      "username": "admin",
      "role": "admin",
      "active": 1,
      "perms": { "all": true }
    }
  ]
}
```

**¿Qué significa cada resultado?**
- `userCount: 0` → No hay usuarios en la BD. Verifica si la migración en `server.js` se ejecutó.
- `userCount > 0` → Hay usuarios. Continúa al step 2.

### 2. Probar Login Manual (curl o Postman)

```bash
curl -X POST https://tu-app.render.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Respuesta esperada:**
```json
{
  "user": {
    "id": "usr_1234567890",
    "username": "admin",
    "full_name": "Administrador",
    "role": "admin",
    "email": "admin@sistema.com",
    "active": 1,
    "branch_id": null,
    "perms": { "all": true }
  },
  "token": "mb:usr_1234567890:1704067200000"
}
```

**Problemas comunes:**
- ❌ Recibe HTML (`<!doctype html>`) → El servidor no está enrutando POST a `/api/auth/login` correctamente
- ❌ Se recibe 404 → `app.use('/api/auth', authRoutes)` no está en `server.js`
- ❌ Se recibe 401 "Invalid credentials" → La contraseña en BD no coincide o el usuario no existe
- ✅ Se recibe JSON válido → Continúa al step 3

### 3. Probar /auth/me (con token)

```bash
# Reemplaza TOKEN con el valor de "token" del step 2
curl -X GET https://tu-app.render.com/api/auth/me \
  -H "Authorization: Bearer mb:usr_1234567890:1704067200000"
```

**Respuesta esperada:** Mismo JSON del usuario que en login

**Problemas comunes:**
- ❌ Recibe HTML → Mismo problema que login
- ❌ Se recibe 401 "No token" → El Authorization header no se está enviando
- ❌ Se recibe 401 "Invalid token" → El formato del token es incorrecto
- ✅ Se recibe JSON válido → El backend funciona correctamente

### 4. Revisar Console del Navegador

Después de hacer login, abre DevTools (F12) y busca las líneas de log:

**Logs esperados:**
```
[auth] login attempt: {identifier: "admin"}
[auth] login payload prepared: {identifier: "admin", username: "admin", email: null, password: "••••"}
[auth] Sending POST to /api/auth/login...
[auth] login response type: object
[auth] login response keys: ["user", "token"]
[auth] User from login: {id: "usr_1234567890", username: "admin", role: "admin", hasPerms: true, perms: {all: true}}
```

**Problemas comunes:**
- ❌ `login response type: string` → Servidor retorna HTML como texto
- ❌ `login response keys: undefined` → response es null o no es objeto
- ❌ `User from login: undefined` → No hay `user` en la respuesta

### 5. Revisar Logs de Render

En el dashboard de Render:
1. Ir a "Logs"
2. Buscar líneas que empiezan con `[login]` o `[auth]`

**Logs esperados cuando se intenta login:**
```
[login] Request received: {identifier: "admin", username: "admin", email: null, hasPassword: true}
[login] Searching for user: admin
[login] User found: {id: "usr_1234567890", username: "admin", role: "admin", active: 1}
[login] Password verified for user: usr_1234567890
[login] Parsed perms: {all: true}
[login] Returning response: {user: {id: "usr_1234567890", username: "admin", role: "admin"}, token: "mb:..."}
```

**Problemas comunes:**
- ❌ `User not found: admin` → Usuario no existe en BD
- ❌ `Invalid password for user: ...` → Contraseña no coincide
- ❌ `User inactive: ...` → El usuario tiene `active = 0`
- ❌ No hay logs en absoluto → El endpoint POST no se está alcanzando

## Soluciones Comunes

### HTML en lugar de JSON
**Causa:** El servidor está sirviendo `index.html` en lugar de JSON
**Solución:** 
1. Verifica que en `server.js` las rutas API estén registradas ANTES del catch-all:
```javascript
app.use('/api/auth', authRoutes);
// ... otros routes ...
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
```

2. Reinicia la aplicación en Render

### Usuario no encontrado
**Causa:** No hay usuarios admin en la BD o migración no se ejecutó
**Solución:**
1. Llama a `/api/auth/debug-users` para verificar
2. En `server.js`, verifica que la condición de crear admin se ejecute:
```javascript
const userCountInitial = await db.execute("SELECT COUNT(*) as count FROM users");
if (userCountInitial.rows[0].count === 0) {
    // ... crea admin ...
}
```

### Variables de entorno
**En Render, verifica:**
- `TURSO_DATABASE_URL` está configurada
- `TURSO_AUTH_TOKEN` está configurada

Si no:
1. Ve a Project Settings en Render
2. Agrega las variables de entorno
3. Redeploy la aplicación

## Flujo Esperado End-to-End

```
1. Usuario escribe usuario: "admin", contraseña: "admin123"
   ↓
2. Frontend envía POST /api/auth/login con credenciales
   ↓
3. Backend valida credenciales en Turso
   ↓
4. Backend retorna {user: {..., role: "admin"}, token: "mb:..."}
   ↓
5. Frontend valida que user.role existe
   ↓
6. Frontend almacena token y usuario en localStorage
   ↓
7. Frontend navega a #/dashboard
   ↓
8. Dashboard carga, router.js verifica hasPerm("all") usando user.role
   ↓
9. Usuario ve dashboard (no "403 Acceso Denegado")
```

## Variables de Debugging Clave

Agrégalas en la URL para debug (solo después de login):
```javascript
// En browser console:
console.log('Auth state:', store.getState().auth);
console.log('Current user:', store.currentUser());
console.log('Has admin perm:', store.hasPerm('all'));
```

## Pasos Finales para Desplegar Fix

1. **Commit & Push:**
```bash
git add .
git commit -m "chore: improve auth debugging and logging"
git push origin main
```

2. **Espera a que Render redeploy** (ver "Deploys" en dashboard)

3. **Prueba `/api/auth/debug-users` primero** (sin login)

4. **Si debug-users funciona, intenta login** en la UI

5. **Revisa Logs de Render** mientras intentas login

6. **Comparte los logs** para que podamos diagnosticar más
