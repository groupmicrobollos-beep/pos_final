const listeners = new Map();

// Helper for API calls
async function api(path, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = state.auth.token; // Changed to use token from state directly or localStorage if managed there
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Include credentials to allow cookies (session sid) to be set/read across origins
    const opts = { method, headers, credentials: 'include' };
    if (body) {
        opts.body = JSON.stringify(body);
        // Helpful debug when diagnosing login issues
        if (path === '/auth/login') console.debug('[api] login payload', body);
    }

    const res = await fetch(`/api${path}`, opts);
    if (!res.ok) {
        // Try to capture response body (JSON or text) for clearer diagnostics
        const text = await res.text().catch(() => "");
        let parsed = null;
        try { parsed = JSON.parse(text); } catch (e) { /* not JSON */ }
        console.warn(`[api] Request failed: ${method} /api${path} status=${res.status} statusText=${res.statusText} body=${text}`);
        throw new Error(parsed?.error || parsed?.message || `${res.status} ${res.statusText}` || 'API Error');
    }

    // Return sensible type based on Content-Type
    const contentType = (res.headers.get('Content-Type') || '').toLowerCase();
    if (contentType.includes('application/json')) return res.json();
    return res.text();
}

// Helper: regenerar permisos basado en rol
function permsFor(role) {
    if (role === "admin")
        return { all: true, inventory: true, quotes: true, settings: true, reports: true, pos: true };
    if (role === "seller")
        return { pos: true, quotes: true, inventory: true };
    if (role === "stock" || role === "depot")
        return { inventory: true, suppliers: true };
    if (role === "sales" || role === "ventas")
        return { pos: true, quotes: true, reports: true };
    if (role === "readonly" || role === "consulta")
        return { readonly: true };
    return {};  // guest/user sin permisos
}

const state = {
    auth: {
        user: (() => {
            const userData = JSON.parse(localStorage.getItem("mb_user") || "null");
            // Si el usuario existe pero no tiene perms, generarlos basado en el rol
            if (userData && !userData.perms && userData.role) {
                userData.perms = permsFor(userData.role);
            }
            return userData;
        })(),
        token: localStorage.getItem("mb_token") || null,
    },
};

export function getState() { return state; }

export function subscribe(key, cb) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(cb);
    return () => listeners.get(key).delete(cb);
}

function notify(key) {
    if (listeners.has(key)) for (const cb of listeners.get(key)) cb(state[key]);
}

export function setAuth(obj) {
    const next = obj || { token: null, user: null };
    state.auth.token = next.token ?? null;
    
    // Asegurar que si el usuario tiene rol pero no perms, generar los perms
    if (next.user && next.user.role && !next.user.perms) {
        next.user.perms = permsFor(next.user.role);
    }
    state.auth.user = next.user ?? null;

    if (state.auth.token) localStorage.setItem("mb_token", state.auth.token);
    else localStorage.removeItem("mb_token");

    if (state.auth.user) localStorage.setItem("mb_user", JSON.stringify(state.auth.user));
    else localStorage.removeItem("mb_user");

    notify("auth");
}

export function logout() { setAuth({ token: null, user: null }); }

export function isAuthenticated() {
    const result = Boolean(state.auth.token || state.auth.user);
    console.log('[store] isAuthenticated:', result, { token: !!state.auth.token, user: !!state.auth.user });
    return result;
}

export function currentUser() { 
    console.log('[store] currentUser:', state.auth.user);
    return state.auth.user || null; 
}

export function hasPerm(perm) {
    const u = currentUser(); 
        if (!u) {
            console.log('[store] hasPerm check failed: no user for perm:', perm);
            return false;
        }
        const p = u.perms || {}; 
        const hasAll = !!p.all;
        const hasPerm = !!p[perm];
        const result = hasAll || hasPerm;
        console.log(`[store] hasPerm("${perm}"):`, { userPerms: p, hasAll, hasThis: hasPerm, result: result });
        return result;
}

export function hasAnyPerm(perms = []) {
    if (!Array.isArray(perms) || perms.length === 0) return false;
    const u = currentUser(); if (!u) return false;
    const p = u.perms || {}; if (p.all) return true;
    return perms.some(k => !!p[k]);
}

// --- Modules ---

// Proveedores
export const suppliers = {
    list: () => api('/suppliers'),
    get: (id) => api(`/suppliers/${id}`), // Assuming backend doesn't implement /:id yet for all, but list works
    create: (s) => api('/suppliers', 'POST', s),
    update: (id, s) => api(`/suppliers/${id}`, 'PUT', s),
    remove: (id) => api(`/suppliers/${id}`, 'DELETE'),
};

// Productos
export const products = {
    list: () => api('/products'),
    get: (id) => api(`/products/${id}`), // Need impl in backend if used specifically
    create: (p) => api('/products', 'POST', p),
    update: (id, p) => api(`/products/${id}`, 'PUT', p),
    remove: (id) => api(`/products/${id}`, 'DELETE'),
};

// Sucursales
export const branches = {
    list: () => api('/branches'),
    create: (b) => api('/branches', 'POST', b),
    update: (id, b) => api(`/branches/${id}`, 'PUT', b),
    remove: (id) => api(`/branches/${id}`, 'DELETE'),
};

// Users
export const users = {
    list: () => api('/users'),
    create: (u) => api('/users', 'POST', u),
    update: (id, u) => api(`/users/${id}`, 'PUT', u), // update fields
    remove: (id) => api(`/users/${id}`, 'DELETE'),
};

// Clients
export const clients = {
    list: () => api('/clients'),
    get: (id) => api(`/clients/${id}`),
    create: (c) => api('/clients', 'POST', c),
    update: (id, c) => api(`/clients/${id}`, 'PUT', c),
    remove: (id) => api(`/clients/${id}`, 'DELETE'),
};

// Presupuestos
export const quotes = {
    list: () => api('/quotes'),
    get: (id) => api(`/quotes/${id}`),
    create: (q) => api('/quotes', 'POST', q),
    update: (id, q) => api(`/quotes/${id}`, 'PUT', q), // If backend supports it
    remove: (id) => api(`/quotes/${id}`, 'DELETE'),     // If backend supports it
};

// Auth
export const auth = {
    async init() { 
        console.log('[auth] init() called');
        
        // 1) Si ya hay usuario en localStorage, usarlo
        if (state.auth.user) {
            console.log('[auth] user already in state:', state.auth.user);
            return state.auth.user;
        }
        
        // 2) Si hay token/cookie válida, intentar obtener datos del usuario del servidor
        try {
            console.log('[auth] attempting to recover session from server...');
            const user = await api('/auth/me', 'GET');
            console.log('[auth] server returned user:', user);
            setAuth({ token: 'cookie', user });
            return user;
        } catch (err) {
            console.log('[auth] no valid session on server:', err?.message);
            return null;
        }
    },
    async login(identifier, password) {
        // Debug: log attempt (avoid logging password in plaintext)
        console.debug('[auth] login attempt:', { identifier });
        // To be compatible with different backend expectations, include multiple keys
        // (identifier, username and email) so servers expecting any of those fields succeed.
        const maybeEmail = (identifier || '').includes('@') ? identifier : null;
        const maybeUsername = maybeEmail ? null : identifier;
        const payload = { identifier, password, username: maybeUsername, email: maybeEmail };
        console.debug('[auth] login payload prepared:', { ...payload, password: '••••' });
        const res = await api('/auth/login', 'POST', payload);
        console.debug('[auth] login response:', res);
        return res;
    },
    async logout() { logout(); },
    async forgotPassword(email) {
        return api('/auth/forgot-password', 'POST', { email });
    },
    async resetPassword(token, newPassword) {
        return api('/auth/reset-password', 'POST', { token, newPassword });
    }
};

export default { products, branches, quotes, suppliers, users, clients, auth, getState, subscribe, setAuth, logout, isAuthenticated, currentUser, hasPerm, hasAnyPerm };

