const listeners = new Map();

// Helper for API calls
async function api(path, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = state.auth.token; // Changed to use token from state directly or localStorage if managed there
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`/api${path}`, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
    }
    return res.json();
}

const state = {
    auth: {
        user: JSON.parse(localStorage.getItem("mb_user") || "null"),
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
    state.auth.user = next.user ?? null;

    if (state.auth.token) localStorage.setItem("mb_token", state.auth.token);
    else localStorage.removeItem("mb_token");

    if (state.auth.user) localStorage.setItem("mb_user", JSON.stringify(state.auth.user));
    else localStorage.removeItem("mb_user");

    notify("auth");
}

export function logout() { setAuth({ token: null, user: null }); }

export function isAuthenticated() {
    return Boolean(state.auth.token || state.auth.user);
}

export function currentUser() { return state.auth.user || null; }

export function hasPerm(perm) {
    const u = currentUser(); if (!u) return false;
    const p = u.perms || {}; if (p.all) return true;
    return !!p[perm];
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
    async init() { return state.auth.user; },
    async login(identifier, password) {
        // Send 'identifier' to match server expectations (identifier or email)
        const res = await api('/auth/login', 'POST', { identifier, password });
        // API returns the user object directly. Leave cookie handling to the server
        // and let the caller call setAuth with a token or cookie marker if desired.
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

