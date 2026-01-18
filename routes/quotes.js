const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM quotes ORDER BY date DESC");
        const quotes = result.rows.map(q => ({
            ...q,
            items: typeof q.items === 'string' ? JSON.parse(q.items) : q.items
        }));
        res.json(quotes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await db.execute({
            sql: "SELECT * FROM quotes WHERE id = ?",
            args: [req.params.id]
        });
        const quote = result.rows[0];
        if (quote) {
            quote.items = typeof quote.items === 'string' ? JSON.parse(quote.items) : quote.items;
        }
        res.json(quote || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const q = req.body;
        const newId = q.id || `quote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const itemsStr = JSON.stringify(q.items || []);

        await db.execute({
            sql: `INSERT INTO quotes (
                id, client_name, client_dni, client_address, client_phone, client_email, 
                vehicle, siniestro, branch_id, total, items, signature, status, date, vat_policy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                newId, q.client_name || '', q.client_dni || '', q.client_address || '', q.client_phone || '', q.client_email || '',
                q.vehicle || '', q.siniestro || '', q.branch_id || null, q.total || 0, itemsStr, q.signature || null,
                q.status || 'draft', q.date ? new Date(q.date).toISOString() : new Date().toISOString(), q.vat_policy || 'all'
            ]
        });
        res.json({ success: true, id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const q = req.body;
        const itemsStr = JSON.stringify(q.items || []);
        await db.execute({
            sql: `UPDATE quotes SET 
                client_name=?, client_dni=?, client_address=?, client_phone=?, client_email=?, 
                vehicle=?, siniestro=?, branch_id=?, total=?, items=?, signature=?, status=?, vat_policy=?
                WHERE id=?`,
            args: [
                q.client_name, q.client_dni, q.client_address, q.client_phone, q.client_email,
                q.vehicle, q.siniestro, q.branch_id, q.total, itemsStr, q.signature, q.status, q.vat_policy || 'all',
                req.params.id
            ]
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await db.execute({ sql: "DELETE FROM quotes WHERE id = ?", args: [req.params.id] });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
