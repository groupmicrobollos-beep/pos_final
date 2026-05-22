const express = require('express');
const router = express.Router();
const { db } = require('../db');

function parseMeta(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return {}; }
}

function rowToSupplier(row) {
    const meta = parseMeta(row.contact_info);
    return {
        id: row.id,
        name: row.name,
        contact_info: row.contact_info,
        company: meta.company || '',
        contact: meta.contact || '',
        phone: meta.phone || '',
        email: meta.email || '',
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        notes: meta.notes || '',
        updatedAt: meta.updatedAt || row.created_at,
    };
}

function bodyToContactInfo(body) {
    const { company, contact, phone, email, tags, notes, updatedAt } = body;
    return JSON.stringify({
        company: company || '',
        contact: contact || '',
        phone: phone || '',
        email: email || '',
        tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(s => s.trim()).filter(Boolean) : []),
        notes: notes || '',
        updatedAt: updatedAt || new Date().toISOString(),
    });
}

router.get('/', async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM suppliers ORDER BY name");
        res.json(result.rows.map(rowToSupplier));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const newId = req.body.id || `sup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const contact_info = bodyToContactInfo(req.body);

        await db.execute({
            sql: "INSERT INTO suppliers (id, name, contact_info) VALUES (?, ?, ?)",
            args: [newId, name.trim(), contact_info],
        });
        res.status(201).json(rowToSupplier({ id: newId, name: name.trim(), contact_info, created_at: new Date().toISOString() }));
    } catch (err) {
        console.error('[suppliers POST]', err);
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name } = req.body;
        const contact_info = bodyToContactInfo(req.body);
        const result = await db.execute({
            sql: "UPDATE suppliers SET name = ?, contact_info = ? WHERE id = ?",
            args: [name || '', contact_info, req.params.id],
        });
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await db.execute({
            sql: "DELETE FROM suppliers WHERE id = ?",
            args: [req.params.id],
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
