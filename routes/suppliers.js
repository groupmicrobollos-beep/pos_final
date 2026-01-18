const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM suppliers ORDER BY name");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { id, name, contact_info } = req.body;
        const newId = id || `sup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await db.execute({
            sql: "INSERT INTO suppliers (id, name, contact_info) VALUES (?, ?, ?)",
            args: [newId, name, contact_info]
        });
        res.json({ id: newId, name, contact_info });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, contact_info } = req.body;
        await db.execute({
            sql: "UPDATE suppliers SET name = ?, contact_info = ? WHERE id = ?",
            args: [name, contact_info, req.params.id]
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await db.execute({
            sql: "DELETE FROM suppliers WHERE id = ?",
            args: [req.params.id]
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
