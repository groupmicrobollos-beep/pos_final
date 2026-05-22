# Despliegue (Git + Turso)

## 1. Variables de entorno

Copiá `.env.example` a `.env` en el servidor (nunca subas `.env` a git):

```env
TURSO_DATABASE_URL=libsql://tu-db.turso.io
TURSO_AUTH_TOKEN=tu_token
PORT=3000
```

En Turso: panel de la base → **Connect** → copiar URL y token.

## 2. Instalación

```bash
npm install
npm start
```

La app sirve frontend + API en el mismo puerto (`PORT`).

## 3. Verificación local

```bash
npm run verify
```

Debe mostrar **0 fallos**.

## 4. Render / Railway / VPS

- **Build command:** `npm install`
- **Start command:** `npm start`
- Configurar las variables `TURSO_*` en el panel del hosting.
- `RENDER=true` opcional si usás el health check de `render_health.js`.

## 5. Login por defecto (solo si la DB está vacía)

- Usuario: `admin`
- Contraseña: `admin123`

Cambiar la contraseña después del primer acceso.
