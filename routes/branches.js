const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM branches ORDER BY name");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { id, name, address, phone, cuit, code } = req.body;
        const newId = id || `branch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await db.execute({
            sql: "INSERT INTO branches (id, name, address, phone, cuit, code) VALUES (?, ?, ?, ?, ?, ?)",
            args: [newId, name, address, phone, cuit, code]
        });
        res.json({ id: newId, name, address, phone, cuit, code });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, address, phone, cuit, code } = req.body;
        await db.execute({
            sql: "UPDATE branches SET name=?, address=?, phone=?, cuit=?, code=? WHERE id=?",
            args: [name, address, phone, cuit, code, req.params.id]
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await db.execute({ sql: "DELETE FROM branches WHERE id = ?", args: [req.params.id] });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
