# Guía de Instalación - Sistema Micro Bollos

Esta guía detalla los pasos necesarios para instalar, configurar y ejecutar el sistema de gestión de Micro Bollos Group.

## Requisitos Previos

Asegúrate de tener instalado el siguiente software en tu sistema:

*   **Node.js** (Versión 16 o superior): [Descargar aquí](https://nodejs.org/)
*   **Git**: [Descargar aquí](https://git-scm.com/)

## Instalación

1.  **Clonar el repositorio** (si aún no lo has hecho) o navegar a la carpeta raíz del proyecto:
    ```bash
    cd c:/Users/Nahuel/Desktop/pos_final-main
    ```

2.  **Instalar dependencias**:
    Ejecuta el siguiente comando para instalar todas las librerías necesarias listadas en `package.json`:
    ```bash
    npm install
    ```

## Configuración de Entorno

El sistema utiliza **Turso (LibSQL)** como base de datos. Necesitas configurar las credenciales en un archivo de entorno.

1.  Crea un archivo llamado `.env` en la raíz del proyecto.
2.  Agrega las siguientes variables con tus credenciales de Turso (si vas a usar base de datos local SQLite, puedes omitir la URL o configurarla como `file:local.db`):

    ```env
    TURSO_DATABASE_URL="libsql://tu-base-de-datos.turso.io"
    TURSO_AUTH_TOKEN="tu-auth-token"
    PORT=3000
    ```

    > **Nota:** Si `TURSO_DATABASE_URL` no está definido, el sistema intentará usar una base de datos local `local.db` en la raíz del proyecto.

## Inicialización y Base de Datos

El sistema cuenta con un mecanismo de migración automática. Al iniciar el servidor por primera vez, el archivo `db.js` ejecutará las sentencias SQL definidas en `schema.sql` para crear las tablas necesarias si no existen.

## Ejecución

### Modo Desarrollo
Para ejecutar el servidor con reinicio automático ante cambios (requiere Node.js v18+ para `--watch` o usar nodemon):

```bash
npm run dev
```

### Modo Producción
Para iniciar el servidor normalmente:

```bash
npm start
```

El servidor se iniciará por defecto en el puerto **3000** (http://localhost:3000).

## Uso

1.  Abre tu navegador web.
2.  Ingresa a `http://localhost:3000`.
3.  Verás la interfaz principal del sistema.

## Solución de Problemas Comunes

*   **Error de Base de Datos:** Verifica que las credenciales en `.env` sean correctas y que tengas conexión a internet si usas Turso.
*   **Módulo no encontrado:** Asegúrate de haber ejecutado `npm install`.
*   **Puerto ocupado:** Cambia el puerto en el archivo `.env` o en `server.js`.
