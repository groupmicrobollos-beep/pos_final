const express = require('express');
const router = express.Router();
const { db } = require('../db');

function parseMeta(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return {}; }
}

function buildDescription(name, code, description) {
    if (name) return code ? `${code} - ${name}` : name;
    return description || '';
}

function rowToProduct(row) {
    const meta = parseMeta(row.meta);
    let name = row.description || '';
    let code = row.code || meta.code || '';
    if (code && name.startsWith(`${code} - `)) {
        name = name.slice(code.length + 3).trim();
    } else if (!code && name.includes(' - ')) {
        const parts = name.split(' - ');
        if (parts.length > 1 && parts[0].length <= 12) {
            code = parts[0].trim();
            name = parts.slice(1).join(' - ').trim();
        }
    }
    return {
        id: row.id,
        description: row.description,
        name,
        code,
        price: row.price,
        cost: row.price,
        category: row.category,
        stock: row.stock ?? 0,
        type: row.type || 'product',
        unit: row.unit || meta.unit || 'u',
        min: row.min_stock ?? meta.min ?? 0,
        supplierId: row.supplier_id || meta.supplierId || '',
        alerts: meta.alerts || {},
        updatedAt: meta.updatedAt || row.created_at,
    };
}

function bodyToDbFields(body) {
    const {
        id, name, description, cost, price, type, category, stock, code,
        unit, min, supplierId, alerts, updatedAt,
    } = body;

    const finalDesc = buildDescription(name, code, description);
    const finalPrice = cost !== undefined ? Number(cost) : (price !== undefined ? Number(price) : 0);
    const meta = JSON.stringify({
        unit: unit || 'u',
        min: min !== undefined ? min : 0,
        supplierId: supplierId || '',
        alerts: alerts || {},
        updatedAt: updatedAt || new Date().toISOString(),
        code: code || '',
    });

    return {
        finalDesc,
        finalPrice: isNaN(finalPrice) ? 0 : finalPrice,
        type: type || 'product',
        category: category || null,
        stock: Math.max(0, parseInt(stock, 10) || 0),
        code: code || null,
        unit: unit || 'u',
        min_stock: Math.max(0, parseInt(min, 10) || 0),
        supplier_id: supplierId || null,
        meta,
    };
}

router.get('/', async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM products ORDER BY description");
        res.json(result.rows.map(rowToProduct));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await db.execute({
            sql: "SELECT * FROM products WHERE id = ?",
            args: [req.params.id],
        });
        if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
        res.json(rowToProduct(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const newId = req.body.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const f = bodyToDbFields(req.body);

        await db.execute({
            sql: `INSERT INTO products (id, description, price, type, category, stock, code, unit, min_stock, supplier_id, meta)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                newId, f.finalDesc, f.finalPrice, f.type, f.category, f.stock,
                f.code, f.unit, f.min_stock, f.supplier_id, f.meta,
            ],
        });
        res.status(201).json(rowToProduct({
            id: newId,
            description: f.finalDesc,
            price: f.finalPrice,
            type: f.type,
            category: f.category,
            stock: f.stock,
            code: f.code,
            unit: f.unit,
            min_stock: f.min_stock,
            supplier_id: f.supplier_id,
            meta: f.meta,
            created_at: new Date().toISOString(),
        }));
    } catch (err) {
        console.error('[products POST]', err);
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const f = bodyToDbFields(req.body);
        const result = await db.execute({
            sql: `UPDATE products SET description=?, price=?, type=?, category=?, stock=?,
                  code=?, unit=?, min_stock=?, supplier_id=?, meta=? WHERE id=?`,
            args: [
                f.finalDesc, f.finalPrice, f.type, f.category, f.stock,
                f.code, f.unit, f.min_stock, f.supplier_id, f.meta, req.params.id,
            ],
        });
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ success: true, id: req.params.id });
    } catch (err) {
        console.error('[products PUT]', err);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await db.execute({
            sql: "DELETE FROM products WHERE id = ?",
            args: [req.params.id],
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
