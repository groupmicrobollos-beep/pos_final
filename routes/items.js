const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM products ORDER BY description");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { id, description, price, type, category } = req.body;
        const newId = id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await db.execute({
            sql: "INSERT INTO products (id, description, price, type, category) VALUES (?, ?, ?, ?, ?)",
            args: [newId, description, price || 0, type || 'product', category || null]
        });
        res.json({ id: newId, description, price, type, category });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { description, price, type, category } = req.body;
        await db.execute({
            sql: "UPDATE products SET description = ?, price = ?, type = ?, category = ? WHERE id = ?",
            args: [description, price, type, category, req.params.id]
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await db.execute({
            sql: "DELETE FROM products WHERE id = ?",
            args: [req.params.id]
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
