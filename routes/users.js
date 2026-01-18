const express = require('express');
const router = express.Router();
const { db } = require('../db');
const crypto = require('crypto');

function hashPassword(plain) {
    return "sha256:" + crypto.createHash('sha256').update(plain).digest('hex');
}

router.get('/', async (req, res) => {
    try {
        const result = await db.execute("SELECT id, username, full_name, role, email, active, perms, branch_id, created_at FROM users ORDER BY username");
        const users = result.rows.map(u => {
            let perms = u.perms;
            if (typeof perms === 'string') {
                try { perms = JSON.parse(perms); } catch { }
            }
            return { ...u, perms: perms || {} };
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { id, username, password, full_name, role, email, active, perms, branch_id } = req.body;
        const newId = id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const password_hash = password ? hashPassword(password) : "";
        const permsStr = typeof perms === 'object' ? JSON.stringify(perms) : perms;

        await db.execute({
            sql: `INSERT INTO users (id, username, password_hash, full_name, role, email, active, perms, branch_id) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [newId, username, password_hash, full_name, role, email, active ? 1 : 0, permsStr, branch_id || null]
        });

        res.json({ id: newId, username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, full_name, role, email, active, perms, branch_id } = req.body;
        const updates = [];
        const args = [];

        if (username !== undefined) { updates.push("username = ?"); args.push(username); }
        if (full_name !== undefined) { updates.push("full_name = ?"); args.push(full_name); }
        if (role !== undefined) { updates.push("role = ?"); args.push(role); }
        if (email !== undefined) { updates.push("email = ?"); args.push(email); }
        if (active !== undefined) { updates.push("active = ?"); args.push(active ? 1 : 0); }
        if (branch_id !== undefined) { updates.push("branch_id = ?"); args.push(branch_id || null); }
        if (perms !== undefined) {
            updates.push("perms = ?");
            args.push(typeof perms === 'object' ? JSON.stringify(perms) : perms);
        }
        if (password) {
            updates.push("password_hash = ?");
            args.push(hashPassword(password));
        }

        if (updates.length === 0) return res.json({ message: "No changes" });
        args.push(id);

        await db.execute({
            sql: `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
            args
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [req.params.id] });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
