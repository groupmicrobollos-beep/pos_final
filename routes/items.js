const express = require('express');
const router = express.Router();
const { db } = require('../db');

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
        const { id, name, description, cost, price, type, category, stock, code } = req.body;
        const newId = id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        // Mapping: name->description, cost->price.
        // If code exists, append to description for now? e.g. "Code - Name"
        const finalDesc = name ? (code ? `${code} - ${name}` : name) : description;
        const finalPrice = cost !== undefined ? cost : (price || 0);

        await db.execute({
            sql: "INSERT INTO products (id, description, price, type, category, stock) VALUES (?, ?, ?, ?, ?, ?)",
            args: [newId, finalDesc, finalPrice, type || 'product', category || null, stock || 0]
        });
        res.json({ id: newId, description: finalDesc, price: finalPrice, stock });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, description, cost, price, type, category, stock, code } = req.body;
        const finalDesc = name ? (code ? `${code} - ${name}` : name) : description;
        const finalPrice = cost !== undefined ? cost : (price || 0);

        await db.execute({
            sql: "UPDATE products SET description = ?, price = ?, type = ?, category = ?, stock = ? WHERE id = ?",
            args: [finalDesc, finalPrice, type, category, stock, req.params.id]
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
