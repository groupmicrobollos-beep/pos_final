const express = require('express');
const router = express.Router();
const { db } = require('../db');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/email');

// /api/auth/me
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '').trim();
        
        console.log('[me] Token recibido:', token);
        
        if (!token) {
            console.log('[me] No hay token');
            return res.status(401).json({ error: "No token" });
        }
        
        const parts = token.split(':');
        if (parts[0] !== 'mb' || !parts[1]) {
            console.log('[me] Token inválido:', parts);
            return res.status(401).json({ error: "Invalid token" });
        }
        
        const userId = parts[1];
        console.log('[me] Buscando usuario con id:', userId);
        
        const result = await db.execute({
            sql: "SELECT id, username, full_name, role, email, active, perms, branch_id FROM users WHERE id = ?",
            args: [userId]
        });
        
        const user = result.rows[0];
        if (!user) {
            console.log('[me] Usuario no encontrado');
            return res.status(404).json({ error: "User not found" });
        }
        
        if (!user.active) {
            console.log('[me] Usuario inactivo');
            return res.status(403).json({ error: "User inactive" });
        }
        
        let perms = user.perms;
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch { perms = {}; }
        }
        
        console.log('[me] Usuario encontrado:', { id: user.id, username: user.username, role: user.role });
        res.json({ ...user, perms: perms || {} });
    } catch (err) {
        console.error('[me] Error:', err);
        res.status(500).json({ error: "Server error: " + err.message });
    }
});

function hashPassword(plain) {
    return "sha256:" + crypto.createHash('sha256').update(plain).digest('hex');
}

router.post('/login', async (req, res) => {
    try {
        const { username, password, identifier, email } = req.body;
        console.log('[login] Request received:', { identifier, username, email, hasPassword: !!password });
        
        // Support both username and identifier
        const searchFor = username || identifier || email;
        if (!searchFor || !password) {
            console.log('[login] Missing required fields');
            return res.status(400).json({ error: "Missing fields" });
        }
        
        console.log('[login] Searching for user:', searchFor);
        const result = await db.execute({
            sql: "SELECT * FROM users WHERE username = ? OR email = ?",
            args: [searchFor, searchFor]
        });
        
        const user = result.rows[0];
        if (!user) {
            console.log('[login] User not found:', searchFor);
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        console.log('[login] User found:', { id: user.id, username: user.username, role: user.role, active: user.active });
        
        if (!user.active) {
            console.log('[login] User inactive:', user.id);
            return res.status(403).json({ error: "User inactive" });
        }
        
        const inputHash = hashPassword(password);
        if (user.password_hash !== inputHash) {
            console.log('[login] Invalid password for user:', user.id);
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        console.log('[login] Password verified for user:', user.id);
        const token = `mb:${user.id}:${Date.now()}`;
        const { password_hash, reset_token, reset_token_expires, ...safeUser } = user;
        
        if (typeof safeUser.perms === 'string') {
            try { 
                safeUser.perms = JSON.parse(safeUser.perms); 
                console.log('[login] Parsed perms:', safeUser.perms);
            } catch (e) { 
                console.warn('[login] Failed to parse perms:', safeUser.perms);
                safeUser.perms = {};
            }
        }
        
        const response = { user: safeUser, token };
        console.log('[login] Returning response:', { user: { id: safeUser.id, username: safeUser.username, role: safeUser.role }, token });
        res.json(response);
    } catch (err) {
        console.error('[login] Caught error:', err);
        res.status(500).json({ error: "Server error: " + err.message });
    }
});

router.post('/logout', (req, res) => {
    res.json({ message: "Logged out" });
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email required" });
        const result = await db.execute({
            sql: "SELECT * FROM users WHERE email = ?",
            args: [email]
        });
        const user = result.rows[0];
        if (!user) {
            return res.json({ message: "If your email is registered, you will receive a reset link." });
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 3600000; // 1 hour
        await db.execute({
            sql: "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
            args: [token, expires, user.id]
        });
        await sendPasswordResetEmail(email, token);
        res.json({ message: "If your email is registered, you will receive a reset link." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: "Missing fields" });
        const result = await db.execute({
            sql: "SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?",
            args: [token, Date.now()]
        });
        const user = result.rows[0];
        if (!user) return res.status(400).json({ error: "Invalid or expired token" });
        const newHash = hashPassword(newPassword);
        await db.execute({
            sql: "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
            args: [newHash, user.id]
        });
        res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Debug endpoint (remove in production)
router.get('/debug-users', async (req, res) => {
    try {
        console.log('[debug] Fetching user count and sample data...');
        const countResult = await db.execute("SELECT COUNT(*) as count FROM users");
        const userCount = countResult.rows[0]?.count || 0;
        
        const userResult = await db.execute("SELECT id, username, role, active, perms FROM users LIMIT 5");
        const users = userResult.rows || [];
        
        console.log('[debug] User count:', userCount);
        console.log('[debug] Sample users:', users);
        
        res.json({ 
            userCount,
            users: users.map(u => ({
                id: u.id,
                username: u.username,
                role: u.role,
                active: u.active,
                perms: typeof u.perms === 'string' ? JSON.parse(u.perms || '{}') : u.perms
            }))
        });
    } catch (err) {
        console.error('[debug] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
