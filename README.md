# Sistema MG — Frontend

Este repositorio contiene el frontend de una aplicación de gestión (Sistema MG). Es una aplicación web sencilla que utiliza JavaScript puro (sin frameworks como React/Vue) junto con Tailwind CSS para estilos y una carpeta `functions/` que contiene endpoints de API (probablemente pensados para un entorno serverless como Netlify o similar).

## Resumen rápido

- Tipo: Single Page Application (SPA) ligera, implementada con JavaScript vanilla.
- Estilos: Tailwind CSS (configuración en `tailwind.config.js`, `postcss.config.js`, entrada en `src/input.css`).
- APIs: Endpoints en `functions/` (carpeta con rutas para productos, presupuestos, usuarios, autenticación, etc.).
- Scripts útiles (en `package.json`):
  - `npm run dev` — ejecuta Tailwind en modo watch para generar `./dist/output.css` mientras desarrollás.
  - `npm run build` — genera la versión minificada de Tailwind en `./dist/output.css`.

## Estructura del proyecto (resumen)

- `index.html` — entrypoint de la aplicación.
- `package.json`, `tailwind.config.js`, `postcss.config.js` — configuración y scripts para Tailwind/PostCSS.
- `src/input.css` — archivo de entrada de Tailwind.
- `dist/output.css` — (generado) salida CSS compilada por Tailwind.
- `js/` — código JavaScript principal:
  - `main.js` — arranque de la app; inicializa router, store y renderiza el shell.
  - `router.js` — enrutador simple que mapea rutas a `pages/*`.
  - `store.js` — almacenamiento global (estado simple para la app).
  - `components/` — componentes reutilizables (ej.: `Shell.js`, `Sidebar.js`, `Topbar.js`).
  - `pages/` — páginas de la SPA (ej.: `Dashboard.js`, `Login.js`, `Presupuestos.js`, `Presupuesto.js`, `Inventario.js`, `Reportes.js`, `Configuracion.js`).
- `assets/` — recursos estáticos (imágenes, íconos, etc.).
- `functions/` — endpoints API (lista de subcarpetas mostradas abajo).

### `functions/` (endpoints)
Colección de funciones/handlers agrupados por recursos. Basado en la estructura proporcionada:

- `api/`
  - `branches.js` — endpoints para sucursales.
  - `products.js` — endpoints generales de productos.
  - `quotes.js` — endpoints para presupuestos.
  - `auth/`
    - `login.js` — login/auth.
    - `logout.js` — cierre de sesión.
    - `me.js` — obtener info del usuario autenticado.
  - `products/`
    - `[id].js` — obtener/editar producto por id.
    - `list.js` — listar productos.
    - `save.js` — crear/actualizar producto.
  - `quotes/`
    - `[id].js` — presupuesto por id.
    - `list.js` — lista de presupuestos.
    - `save.js` — guardar presupuesto.
  - `shopping/`
    - `[id].js`, `list.js`, `save.js` — operaciones de compras.
  - `stock/`
    - `movement.js` — movimientos de stock.
  - `suppliers/`
    - `[id].js`, `list.js`, `save.js` — proveedores.
  - `users/`
    - `list.js`, `save.js` — gestión de usuarios.

> Nota: Las funciones están implementadas en JavaScript CommonJS (según `package.json` -> `type: commonjs`). Dependiendo del proveedor serverless, puede que no necesites cambiar nada o sí adaptar exports.

## Flujo general de la SPA

1. `index.html` carga `dist/output.css` (generado por Tailwind) y los scripts `js/main.js` y los módulos JS.
2. `main.js` inicializa la aplicación: monta el `Shell` (estructura general: sidebar/topbar), inicializa `store` y `router`.
3. `router.js` escucha cambios en el `hash` (o history) y carga la página correspondiente desde `js/pages/*`.
4. Las `pages` usan `components` y el `store` para leer/actualizar estado y realizan llamadas a las APIs en `functions/` (fetch a rutas relativas `/api/...` si están desplegadas junto al frontend o al endpoint correspondiente).

## Principales componentes y responsabilidades

- Shell.js — contenedor principal de la aplicación, incluye `Sidebar` y `Topbar` y el área principal donde se renderizan las páginas.
- Sidebar.js — navegación lateral con links a las páginas principales.
- Topbar.js — barra superior que puede contener control de usuario, búsqueda o acciones rápidas.
- Pages — cada archivo en `js/pages/` expone una función/objeto que renderiza el HTML para esa vista y maneja su lógica (eventos, llamadas a API, manipulación DOM).
- store.js — objeto simple para mantener estado global (por ejemplo, usuario autenticado, carrito, filtros). No es un store complejo como Redux; es una implementación ligera.

## Autenticación

- La autenticación parece manejarse vía `functions/api/auth/*`. La página `Login.js` realiza una petición a `auth/login.js`.
- `auth/me.js` devuelve datos del usuario autenticado (útil para validar sesión al cargar la app).
- `auth/logout.js` cierra la sesión.

Recomendación: revisar cómo se manejan tokens (cookies, localStorage, headers Authorization) dentro de las funciones y en `main.js`/`store.js` para asegurar persistencia entre recargas.

## Cómo ejecutar en desarrollo

1. Instalar dependencias de desarrollo (Tailwind/PostCSS):

```powershell
npm install
```

2. Ejecutar Tailwind en modo watch (generará `./dist/output.css`):

```powershell
npm run dev
```

3. Abrir `index.html` en un servidor estático o con Live Server (recomendado) para evitar problemas con llamadas fetch y CORS. En Windows PowerShell podés usar por ejemplo:

```powershell
# si tenés http-server instalado globalmente
npx http-server -c-1 .
# o usar la extensión Live Server de VSCode (recomendado para desarrollo rápido)
```

4. Si desplegás en producción, primero generá CSS minificado:

```powershell
npm run build
```

y luego serví los archivos estáticos (`index.html`, `dist/output.css`, `js/`, `assets/`). Si usás un host que soporte funciones serverless (Netlify, Vercel), desplegá también la carpeta `functions/` como funciones del proveedor.

## Deployment (sugerencias)

- Netlify: podés subir el frontend como sitio estático y configurar la carpeta `functions/` para que Netlify la use como funciones serverless (o separarlas y usar Netlify Functions/Netlify CLI). Asegurate de que rutas fetch apunten a `/.netlify/functions/<nombre>` si Netlify las expone así.
- Vercel: subí el proyecto y crea las API routes a partir de `api/` si la estructura se adapta. Puede requerir renombrar/ajustar exports.
- Alternativa: desplegar frontend static y montar una API separada (Express/Node) que use el código de `functions/` adaptado.

## Buenas prácticas y pasos sugeridos antes de cambios grandes

- Confirmá cómo se exponen las funciones en el entorno de despliegue (rutas reales). Ajustá las llamadas fetch en el frontend si es necesario.
- Añadí un pequeño wrapper para fetch que incluya manejo de tokens y errores comunes (401 -> redirigir a login, 500 -> notificar).
- Agregá validaciones en el cliente para formularios antes de enviar a `save.js`.
- Considerá tests unitarios mínimos para utilidades y endpoints (si convertís `functions/` a un proyecto Node separado, podés usar jest/mocha).

## Cómo extender la aplicación (ejemplos rápidos)

- Añadir una nueva página:
  1. Crear `js/pages/NuevaPagina.js` con una función que devuelva HTML y attach events.
  2. Añadir la ruta en `router.js` (mapear hash `/nueva` a `NuevaPagina`).
  3. Añadir link en `components/Sidebar.js`.

- Añadir un nuevo endpoint API:
  1. Crear el archivo dentro de `functions/api/<recurso>/` siguiendo la convención ya usada (`list.js`, `save.js`, `[id].js`).
  2. Implementar la lógica de persistencia (archivo, DB o llamada externa).
  3. Consumirlo desde la página correspondiente con fetch.

## Comprobaciones rápidas (debug)

- Si la app no carga estilos: ejecutá `npm run dev` y verificá que `dist/output.css` exista y esté linkeado en `index.html`.
- Si las llamadas fetch retornan 404: verificá la URL de la API y si las funciones están desplegadas o el servidor está corriendo.
- Para problemas de CORS al usar funciones locales, serví todo desde el mismo origen (usar un static server combinado con un proxy, o configurar CORS en la API).

## Archivos clave y su propósito (lista corta)

- `index.html` — entrada de la app, carga CSS generado y JS.
- `js/main.js` — inicializa SPA.
- `js/router.js` — enrutamiento.
- `js/store.js` — estado global.
- `js/components/*` — UI compartida.
- `js/pages/*` — vistas de la SPA.
- `functions/` — API endpoints (serverless o adaptables).
- `src/input.css`, `tailwind.config.js`, `postcss.config.js` — configuración Tailwind/PostCSS.

## Próximos pasos y cómo puedo ayudar

1. Revisé y generé este README con la información disponible en el proyecto.
2. Si querés que haga cambios concretos (ej.: agregar autenticación con JWT en `store.js`, modificar rutas de API, crear endpoints adicionales, implementar un wrapper de fetch, añadir tests o integrar un empaquetador como Vite), decime los cambios específicos y los implemento.

---

Si querés, ahora lo guardo en el repo (ya lo hice) y estoy listo para que me pases la lista de cambios que necesitás realizar. Decime qué querés modificar y lo implemento.
