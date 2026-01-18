const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB } = require('../db');

// --- Helpers ---
const rid = () => crypto.randomUUID();

// GET /api/clients - with optional search
router.get('/', async (req, res) => {
    try {
        const db = getDB();
        const clients = await db.execute("SELECT * FROM clients ORDER BY name ASC");

        // Fetch vehicles for each client (inefficient for large DBs but fine for this scale)
        const clientsWithVehicles = await Promise.all(clients.rows.map(async (c) => {
            const vehicles = await db.execute({
                sql: "SELECT * FROM vehicles WHERE client_id = ?",
                args: [c.id]
            });
            return { ...c, vehicles: vehicles.rows };
        }));

        res.json(clientsWithVehicles);
    } catch (error) {
        console.error("Error fetching clients:", error);
        res.status(500).json({ error: error.message });
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
            for (const v of vehicles) {
                const vid = rid();
                await db.execute({
                    sql: "INSERT INTO vehicles (id, client_id, brand, model, year, plate, vin, insurance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    args: [vid, id, v.brand || v.vehiculo, v.model || "", v.year || v.modelo, v.plate || v.patente, v.vin || v.chasis, v.insurance || v.compania]
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
            for (const v of vehicles) {
                if (v.id && existingIds.has(v.id)) {
                    // Update
                    await db.execute({
                        sql: "UPDATE vehicles SET brand = ?, model = ?, year = ?, plate = ?, vin = ?, insurance = ? WHERE id = ?",
                        args: [v.brand || v.vehiculo, v.model || "", v.year || v.modelo, v.plate || v.patente, v.vin || v.chasis, v.insurance || v.compania, v.id]
                    });
                } else {
                    // Create
                    const vid = v.id || rid();
                    await db.execute({
                        sql: "INSERT INTO vehicles (id, client_id, brand, model, year, plate, vin, insurance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        args: [vid, clientId, v.brand || v.vehiculo, v.model || "", v.year || v.modelo, v.plate || v.patente, v.vin || v.chasis, v.insurance || v.compania]
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
