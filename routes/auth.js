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
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Missing fields" });
        const result = await db.execute({
            sql: "SELECT * FROM users WHERE username = ? OR email = ?",
            args: [username, username]
        });
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        if (!user.active) return res.status(403).json({ error: "User inactive" });
        const inputHash = hashPassword(password);
        if (user.password_hash !== inputHash) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = `mb:${user.id}:${Date.now()}`;
        const { password_hash, ...safeUser } = user;
        if (typeof safeUser.perms === 'string') {
            try { safeUser.perms = JSON.parse(safeUser.perms); } catch { }
        }
        res.json({ user: safeUser, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
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

module.exports = router;
