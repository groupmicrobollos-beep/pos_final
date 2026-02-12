function render403(root) {
    const html = `
        <div class="p-6">
            <h1 class="text-xl font-semibold">403 — Acceso denegado</h1>
            <p class="text-slate-400 mt-1">No tenés permisos para acceder a esta sección.</p>
        </div>`;
    root.innerHTML = Shell.render(html);
    Shell.mount(root);
}
// ./router.js
import { isAuthenticated, setAuth, hasPerm, hasAnyPerm, getState } from "./store.js";
import { Shell } from "./components/Shell.js";

// === Definición de rutas con metadatos de permisos ===
// requireAll: requiere TODOS esos permisos
// requireAny: requiere AL MENOS uno de esos permisos
const ROUTES = {
    "/login": { public: true, loader: () => import("./pages/Login.js") },
        "/dashboard": { path: "/dashboard", public: false, loader: () => import("./pages/Dashboard.js") },
        "/presupuesto": { path: "/presupuesto", public: false, loader: () => import("./pages/Presupuesto.js"), requireAny: ["pos", "quotes"] },
        "/presupuestos": { path: "/presupuestos", public: false, loader: () => import("./pages/Presupuestos.js"), requireAny: ["quotes"] },
        "/reportes": { path: "/reportes", public: false, loader: () => import("./pages/Reportes.js"), requireAny: ["reports"] },
        "/inventario": { path: "/inventario", public: false, loader: () => import("./pages/Inventario.js"), requireAny: ["inventory", "suppliers"] },
        "/clientes": { path: "/clientes", public: false, loader: () => import("./pages/Clientes.js"), requireAny: ["quotes", "pos"] },
        "/configuracion": { path: "/configuracion", public: false, loader: () => import("./pages/Configuracion.js"), requireAny: ["settings"] },

    // Ruta técnica para cerrar sesión
    "/logout": { public: true, loader: async () => ({ default: { render: () => "", mount() { } } }) },

    // 404 por defecto
    "/404": {
        public: true,
        loader: async () => ({
            default: {
                render: () => `
          <div class="p-6">
            <h1 class="text-2xl font-semibold">404</h1>
            <p class="text-slate-400">Ruta no encontrada.</p>
          </div>`,
                mount() { },
            },
        }),
    },
};

function currentPath() {
    const raw = (location.hash || "").replace(/^#/, "");
    return raw || "/dashboard";
}

function resolveRoute(path) {
    return ROUTES[path] ? path : "/404";
}

function canAccess(meta = {}) {
    // Público
    if (meta.public) return true;

    // Requiere login
    const auth = getState().auth;
    console.log('[router] canAccess check:', {
        authenticated: isAuthenticated(),
        userId: auth.user?.id,
        username: auth.user?.username,
        role: auth.user?.role,
        userPerms: auth.user?.perms,
        metaPath: meta.path || 'unknown'
    });

    // Chequeos de permisos
    if (meta.requireAll && Array.isArray(meta.requireAll) && meta.requireAll.length) {
        const allOk = meta.requireAll.every((p) => hasPerm(p));
        console.log('[router] requireAll check:', { required: meta.requireAll, result: allOk });
        if (!allOk) {
            console.log(`[router] requireAll check: necesita [${meta.requireAll.join(', ')}] → ${allOk ? '✓' : '❌'}`);
            return false;
        }
    }
    // basta con tener uno
    if (meta.requireAny && Array.isArray(meta.requireAny) && meta.requireAny.length) {
        const anyOk = meta.requireAny.some((p) => hasPerm(p));
        console.log('[router] requireAny check:', { required: meta.requireAny, result: anyOk });
        if (!anyOk) {
            console.log(`[router] requireAny check: necesita UNO de [${meta.requireAny.join(', ')}] → ${anyOk ? '✓' : '❌'}`);
            return false;
        }
    }
    return true;
}

async function renderRoute(root) {
    let path = resolveRoute(currentPath());
    const meta = ROUTES[path];

    // Logout: limpia sesión y redirige a login
    if (path === "/logout") {
        setAuth({ token: null, user: null });
        location.hash = "#/login";
        return;
    }

    // Guard de autenticación / permisos
    if (!canAccess(meta)) {
        if (!meta.public && !isAuthenticated()) {
            // no logueado → login
            location.hash = "#/login";
            return;
        }
        // logueado pero sin permisos → 403 dentro del Shell
        render403(root);
        return;
    }

    // Si ya estoy logueado y voy a /login → mandar a dashboard
    if (path === "/login" && isAuthenticated()) {
        location.hash = "#/dashboard";
        return;
    }

    // Carga de la página
    const mod = await meta.loader();
    const page = mod.default;

    // /login se renderiza sin Shell
    if (path === "/login") {
        root.innerHTML = page.render();
        page.mount?.(root);
        window.scrollTo({ top: 0, behavior: "instant" });
        return;
    }

    // Rutas internas con Shell
    const html = page.render();
    root.innerHTML = Shell.render(html);
    Shell.mount(root);
    page.mount?.(root.querySelector("#view"));

    window.scrollTo({ top: 0, behavior: "instant" });
    window.dispatchEvent(new Event("router:content-loaded"));
}

export const router = {
    init(root) {
        const handler = () => renderRoute(root);
        window.addEventListener("hashchange", handler);
        window.addEventListener("load", handler);

        // Primera ejecución
        handler();
    },
};

// ✅ Eliminamos el viejo bloque duplicado de routing (PUBLIC/handleRoute)
// para evitar conflictos de guards y doble render.
