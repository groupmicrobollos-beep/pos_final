const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB } = require('../db');

// --- Helpers ---
const rid = () => crypto.randomUUID();

/** Acepta campos en español (vehiculo, patente…) o inglés (brand, plate…). */
function normalizeVehicle(v = {}) {
    const yearRaw = v.year ?? v.modelo;
    const yearNum = yearRaw !== undefined && yearRaw !== '' && yearRaw !== null
        ? parseInt(String(yearRaw), 10)
        : null;
    return {
        id: v.id || undefined,
        brand: (v.brand || v.vehiculo || '').trim() || null,
        model: (v.model || '').trim() || null,
        year: Number.isFinite(yearNum) ? yearNum : null,
        plate: (v.plate || v.patente || '').trim() || null,
        vin: (v.vin || v.chasis || '').trim() || null,
        insurance: (v.insurance || v.compania || '').trim() || null,
    };
}

function normalizeVehicles(vehicles) {
    if (!Array.isArray(vehicles)) return [];
    return vehicles.map(normalizeVehicle);
}

// GET /api/clients - with optional search
router.get('/', async (req, res) => {
    try {
        console.log('[clients.list] Starting to fetch clients...');
        const db = getDB();
        
        // Usar JOIN para traer todo de una sola consulta (mucho más rápido)
        const query = `
            SELECT 
                c.id, c.name, c.phone, c.email, c.address, c.created_at, c.updated_at,
                v.id as vehicle_id, v.brand, v.model, v.year, v.plate, v.vin, v.insurance
            FROM clients c
            LEFT JOIN vehicles v ON v.client_id = c.id
            ORDER BY c.name ASC, c.id ASC
        `;
        
        const result = await db.execute(query);
        console.log(`[clients.list] Query returned ${result.rows?.length || 0} rows (clients + vehicles)`);
        
        if (!result.rows || result.rows.length === 0) {
            console.log('[clients.list] No clients found, returning empty array');
            return res.json([]);
        }

        // Agrupar filas en clientes con sus vehículos
        const clientMap = new Map();
        
        result.rows.forEach(row => {
            if (!clientMap.has(row.id)) {
                clientMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    phone: row.phone,
                    email: row.email,
                    address: row.address,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    vehicles: []
                });
            }
            
            // Agregar vehículo si existe
            if (row.vehicle_id) {
                clientMap.get(row.id).vehicles.push({
                    id: row.vehicle_id,
                    brand: row.brand,
                    model: row.model,
                    year: row.year,
                    plate: row.plate,
                    vin: row.vin,
                    insurance: row.insurance,
                    client_id: row.id
                });
            }
        });

        const clientsWithVehicles = Array.from(clientMap.values());
        console.log(`[clients.list] Returning ${clientsWithVehicles.length} clients`);
        res.json(clientsWithVehicles);
        
    } catch (error) {
        console.error("[clients.list] Error fetching clients:", error);
        res.status(500).json({ 
            error: error.message || "Error fetching clients",
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
    try {
        const db = getDB();
        const result = await db.execute({
            sql: "SELECT * FROM clients WHERE id = ?",
            args: [req.params.id]
        });
        if (result.rows.length === 0) return res.status(404).json({ error: "Client not found" });

        const client = result.rows[0];
        const vehicles = await db.execute({
            sql: "SELECT * FROM vehicles WHERE client_id = ?",
            args: [client.id]
        });

        res.json({ ...client, vehicles: vehicles.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/clients - Create Client (and optionally vehicles)
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, address, vehicles } = req.body;
        if (!name) return res.status(400).json({ error: "Name is required" });

        const db = getDB();
        const id = rid();

        await db.execute({
            sql: "INSERT INTO clients (id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)",
            args: [id, name, phone || null, email || null, address || null]
        });

        // Add vehicles if provided
        if (Array.isArray(vehicles) && vehicles.length > 0) {
            for (const raw of normalizeVehicles(vehicles)) {
                const v = normalizeVehicle(raw);
                const vid = v.id || rid();
                await db.execute({
                    sql: "INSERT INTO vehicles (id, client_id, brand, model, year, plate, vin, insurance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    args: [vid, id, v.brand, v.model, v.year, v.plate, v.vin, v.insurance]
                });
            }
        }

        res.status(201).json({ id, message: "Client created" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/clients/:id - Update Client
router.put('/:id', async (req, res) => {
    try {
        const { name, phone, email, address, vehicles } = req.body;
        const db = getDB();
        const clientId = req.params.id;

        await db.execute({
            sql: "UPDATE clients SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?",
            args: [name, phone, email, address, clientId]
        });

        // Sync vehicles: easier strategy -> delete all and recreate (or upsert). 
        // For simplicity and "perfection", let's be smart. 
        // If vehicles is provided, we sync. If not, we leave them alone? 
        // User likely sends full state. Let's do a smart sync if vehicles array is present.

        if (Array.isArray(vehicles)) {
            // Get existing IDs to know what to keep/update/delete?
            // "Brute force" replace is safer for consistency if frontend sends full list.
            // But we want to keep IDs if possible.

            // 1. Get existing
            const existing = await db.execute({ sql: "SELECT id FROM vehicles WHERE client_id = ?", args: [clientId] });
            const existingIds = new Set(existing.rows.map(r => r.id));
            const incomingIds = new Set(vehicles.map(v => v.id).filter(Boolean));

            // Delete removed
            for (const row of existing.rows) {
                if (!incomingIds.has(row.id)) {
                    await db.execute({ sql: "DELETE FROM vehicles WHERE id = ?", args: [row.id] });
                }
            }

            // Upsert incoming
            for (const raw of normalizeVehicles(vehicles)) {
                const v = normalizeVehicle(raw);
                if (v.id && existingIds.has(v.id)) {
                    await db.execute({
                        sql: "UPDATE vehicles SET brand = ?, model = ?, year = ?, plate = ?, vin = ?, insurance = ? WHERE id = ?",
                        args: [v.brand, v.model, v.year, v.plate, v.vin, v.insurance, v.id]
                    });
                } else {
                    const vid = v.id || rid();
                    await db.execute({
                        sql: "INSERT INTO vehicles (id, client_id, brand, model, year, plate, vin, insurance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        args: [vid, clientId, v.brand, v.model, v.year, v.plate, v.vin, v.insurance]
                    });
                }
            }
        }

        res.json({ message: "Client updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
    try {
        const db = getDB();
        // Vehicles cascade delete if supported, but let's be explicit
        await db.execute({ sql: "DELETE FROM vehicles WHERE client_id = ?", args: [req.params.id] });
        await db.execute({ sql: "DELETE FROM clients WHERE id = ?", args: [req.params.id] });
        res.json({ message: "Client deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
