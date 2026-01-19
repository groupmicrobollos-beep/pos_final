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
        // Frontend sends 'numero' as the formatted ID (e.g. 0001-000001). Use it if present.
        const newId = q.numero || q.id || `quote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const itemsStr = JSON.stringify(q.items || []);

        // Map frontend nested 'cliente' object to flat DB columns
        const c = q.cliente || {};

        await db.execute({
            sql: `INSERT INTO quotes (
                id, client_name, client_dni, client_address, client_phone, client_email, 
                vehicle, siniestro, branch_id, total, items, signature, status, date, vat_policy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                newId,
                c.nombre || q.client_name || '',
                c.dni || q.client_dni || '',
                c.address || q.client_address || '',
                c.telefono || q.client_phone || '',
                c.email || q.client_email || '',
                // Vehicle info might be in 'vehicle' string or inside client object
                c.vehiculo || q.vehicle || '',
                q.siniestro || '',
                q.sucursal || q.branch_id || null,
                q.total || 0,
                itemsStr,
                q.signature || null,
                q.estado || q.status || 'draft',
                q.fecha ? new Date(q.fecha).toISOString() : new Date().toISOString(),
                q.vatPolicy || q.vat_policy || 'all'
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
        const c = q.cliente || {};

        await db.execute({
            sql: `UPDATE quotes SET 
                client_name=?, client_dni=?, client_address=?, client_phone=?, client_email=?, 
                vehicle=?, siniestro=?, branch_id=?, total=?, items=?, signature=?, status=?, vat_policy=?
                WHERE id=?`,
            args: [
                c.nombre || q.client_name || null,
                c.dni || q.client_dni || null,
                c.address || q.client_address || null,
                c.telefono || q.client_phone || null,
                c.email || q.client_email || null,
                c.vehiculo || q.vehicle || null,
                q.siniestro || null,
                q.sucursal || q.branch_id || null,
                q.total || 0,
                itemsStr,
                q.signature || null,
                q.estado || q.status || 'draft',
                q.vatPolicy || q.vat_policy || 'all',
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
