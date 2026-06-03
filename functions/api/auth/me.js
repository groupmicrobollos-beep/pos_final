// /api/auth/me.js

// ===== CORS helpers =====
function cors(req) {
    const origin = req.headers.get("Origin");
    // Si no hay Origin, permitimos cualquier origen (pero sin credentials)
    if (!origin) return {
        "Access-Control-Allow-Origin": "*",
    };
    // Si hay Origin, lo reflejamos y permitimos credentials
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin",
    };
}

function json(d, s = 200, req) {
    const headers = {
        "Content-Type": "application/json",
        ...(req ? cors(req) : {})
    };
    return new Response(JSON.stringify(d), { status: s, headers });
}

// ===== Permisos (alineado a login) =====
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

// ===== Cookie helper (robusto) =====
function getCookie(req, name) {
    try {
        const cookieHeader = req.headers.get("Cookie");
        if (!cookieHeader) return null;
        
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = decodeURIComponent(value);
            return acc;
        }, {});
        
        return cookies[name] || null;
    } catch (err) {
        console.error("[getCookie] error parsing cookie:", err);
        return null;
    }
}

// ===== Handlers =====
export const onRequestOptions = async ({ request }) =>
    new Response(null, { headers: cors(request) });

export const onRequestGet = async ({ request, env }) => {
    try {
        // 1) Leer autenticación - aceptar Bearer token O cookie 'sid'
        const authHeader = request.headers.get("Authorization") || "";
        const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        const sid = getCookie(request, "sid");
        
        if (!bearerToken && !sid) {
            console.warn("[me] No authentication found (no Bearer token or session cookie)");
            return json({ error: "No authentication" }, 401, request);
        }

        // 2) Si tenemos Bearer token, retornar usuario básico (ya está autenticado desde frontend)
        if (bearerToken && !sid) {
            console.log("[me] Using Bearer token for authentication");
            // Con Bearer token, retornar un usuario genérico
            // El frontend debe tener el usuario en localStorage
            return json({
                id: "token-user",
                email: "token@bearer",
                username: "bearer-auth",
                role: "user",
                full_name: "Bearer Token User",
                perms: permsFor("user"),
            }, 200, request);
        }

        // 3) Si tenemos cookie 'sid', buscar sesión válida
        const sql = `
        SELECT u.id, u.email, u.username, u.role, u.branch_id, u.full_name
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = ?
          AND CAST(strftime('%s', s.expires_at) AS INTEGER) > CAST(strftime('%s','now') AS INTEGER)
          AND COALESCE(u.active,1) = 1
        LIMIT 1
        `;

        let row;
        try {
            const { results } = await env.DB.prepare(sql).bind(sid).all();
            row = results?.[0];

            if (!row) {
                console.warn("[me] No valid session found for sid:", sid);
                return json({ error: "No session" }, 401, request);
            }

            // 4) Responder usuario + permisos
            const userOut = {
                ...row,
                role: row.role || "user",  // Asegurar que siempre hay un role
                perms: permsFor(row.role || "user"),  // Generar perms basado en role
            };

            return json(userOut, 200, request);

        } catch (err) {
            console.error("[me] query error", err);
            return json({ error: "Error interno" }, 500, request);
        }
    } catch (err) {
        console.error("[me] unexpected error", err);
        return json({ error: "Error interno" }, 500, request);
    }
};
