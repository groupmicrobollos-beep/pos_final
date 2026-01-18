const express = require('express');
const router = express.Router();
const { db } = require('../db');
const crypto = require('crypto');

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

module.exports = router;
