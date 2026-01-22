# Documentación Técnica - Sistema MG

## 1. Visión General
El **Sistema MG** es una aplicación Web Full Stack diseñada para la gestión de talleres mecánicos y puntos de venta. Permite administrar clientes, vehículos, presupuestos (con firma digital y generación de PDF), usuarios, sucursales y proveedores.

La aplicación opera como una **SPA (Single Page Application)** en el frontend, servida por un backend **Node.js** que también expone una API REST para la persistencia de datos.

## 2. Stack Tecnológico

### Backend (Servidor)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Base de Datos**: SQLite / LibSQL (Turso)
    - Cliente: `@libsql/client`
    - Archivo local: `local.db` (por defecto) o conexión remota segura.
- **Utilidades**:
    - `dotenv`: Gestión de variables de entorno.
    - `cors`: Manejo de orígenes cruzados (aunque en producción se sirve desde el mismo origen).
    - `resend`: (Opcional) Integración para envío de emails.

### Frontend (Cliente)
- **Lenguaje**: JavaScript (Vanilla ES Modules). No requiere compilación (build step opcional).
- **Estilos**: TailwindCSS (vía script importado o CDN).
- **Arquitectura**: SPA modular baseada en:
    - `router.js`: Maneja la navegación sin recargar la página.
    - `store.js`: Gestión de estado global y cliente API.
    - `pages/*.js`: Lógica específica de cada vista (Controladores).
- **Librerías Clave**:
    - `jspdf` y `jspdf-autotable`: Generación de PDFs en el cliente.
    - `FontAwesome`: Iconografía.
    - `Google Fonts`: Tipografía (Inter/Outfit).

## 3. Arquitectura del Proyecto

### Estructura de Carpetas (Frontend = Root)
La aplicación sirve todo desde la carpeta raíz (donde reside `server.js`).

```
/
├── assets/             # Imágenes estáticas y logos
├── js/                 # Código fuente Frontend
│   ├── components/     # Componentes UI reutilizables (Sidebar, Navbar)
│   ├── pages/          # Lógica de vistas (Presupuesto.js, Clientes.js, etc.)
│   ├── services/       # Lógica de negocio (pdf-generator.js, budgets.js)
│   ├── router.js       # Enrutador cliente
│   ├── store.js        # State Management & API Client
│   └── main.js         # Punto de entrada frontend
├── routes/             # Rutas API del Backend (Express Routers)
│   ├── auth.js         # Login/Registro
│   ├── quotes.js       # API Presupuestos
│   └── ...
├── db.js               # Conexión DB y Migraciones Automáticas
├── server.js           # Entry point del servidor
├── schema.sql          # Definición de tablas
└── index.html          # HTML Principal (Shell de la SPA)
```

### Flujo de Datos
1.  **Frontend**: El usuario interactúa con la interfaz (`index.html` + `js/pages/*.js`).
2.  **Store**: La vista llama a métodos en `js/store.js` (ej: `store.quotes.create(...)`).
3.  **API**: `store.js` hace `fetch` a `/api/...`.
4.  **Backend**: `server.js` redirige al router correspondiente en `routes/`.
5.  **Database**: El router usa `db.js` para ejecutar SQL sobre SQLite/LibSQL.

## 4. Procesos Clave Desarrollados

### 4.1. Módulo de Presupuestos (`Presupuesto.js`)
El núcleo del sistema. Permite crear cotizaciones complejas.
- **Selección de Cliente/Vehículo**: Busca en tiempo real o crea nuevos.
- **Ítems**:
    - Piezas predefinidas con selectores.
    - Piezas personalizadas (escritura libre).
    - Mano de obra (servicios).
    - Repuestos (gestión de stock simple en presupuesto).
- **Lógica de Estado**:
    - Checkbox "Hecho" sincronizado en tiempo real con el Select "Estado".
    - Cálculos automáticos de Subtotal e IVA (configurable por ítem o global).
- **Firma Digital**: Canvas HTML5 para dibujar firma en pantalla táctil o mouse.
- **Persistencia**: Guarda en tabla `quotes` como JSON estructurado.

### 4.2. Generación de PDF (`pdf-generator.js`)
Sistema de reporte profesional "Client-Side".
- **Diseño**: "Boxed Layout" (Recuadros) similar a facturas formales.
- **Funcionalidades**:
    - Detección automática de Logo (Assets locales o personalizados).
    - Ajuste dinámico de textos para evitar solapamientos.
    - Paginación automática si hay muchos ítems.
    - Renderizado de firma digital embebida.

### 4.3. Base de Datos & Migraciones
No requiere configuración manual SQL. `db.js` ejecuta `schema.sql` al inicio:
- Crea tablas si no existen (`quotes`, `users`, `clients`, `vehicles`, etc.).
- Aplica migraciones ("Schema Evolution") automáticamente (ej: `tags` o columnas nuevas).
- Crea un usuario **admin** por defecto si la base está vacía.

## 5. Guía de Despliegue

### Requisitos
- Node.js v18+ instalado.

### Instalación
1.  Abrir terminal en la carpeta raíz.
2.  Ejecutar: `npm install` (Instala dependencias del `package.json`).

### Ejecución
- **Modo Desarrollo**: `npm run dev` (Reinicia al detectar cambios).
- **Modo Producción**: `npm start` (Ejecuta `node server.js`).
- El sistema estará disponible en `http://localhost:3000`.

### Variables de Entorno (.env)
Crear un archivo `.env` en la raíz (opcional para local, obligatorio para nube):
```env
PORT=3000
# Si se usa base de datos remota (Turso):
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

---
**Desarrollado para:** Sistema MG
**Versión de Documentación:** 1.0
