// /api/auth/me
router.get('/me', async (req, res) => {
    // Busca el token en headers o cookies (ajusta según tu lógica)
    const token = req.headers.authorization?.replace('Bearer ', '') || null;
    if (!token) return res.status(401).json({ error: "No token" });

    // Extrae el userId del token (ajusta si usás JWT, aquí es simple)
    const parts = token.split(':');
    if (parts[0] !== 'mb' || !parts[1]) return res.status(401).json({ error: "Invalid token" });
    const userId = parts[1];

    try {
        const result = await db.execute({
            sql: "SELECT id, username, full_name, role, email, active, perms, branch_id FROM users WHERE id = ?",
            args: [userId]
        });
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: "User not found" });
        if (!user.active) return res.status(403).json({ error: "User inactive" });

        let perms = user.perms;
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch { perms = {}; }
        }
        res.json({ ...user, perms: perms || {} });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/email');

// Helper for SHA-256 (matches frontend logic)
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
