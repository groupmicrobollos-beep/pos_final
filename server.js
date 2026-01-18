const express = require('express');
const cors = require('cors');
const { db, initDB } = require('./db');

const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the CURRENT directory (which IS the frontend)
app.use(express.static(__dirname));

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const branchRoutes = require('./routes/branches');
const quoteRoutes = require('./routes/quotes');
const supplierRoutes = require('./routes/suppliers');
const userRoutes = require('./routes/users');
const clientsRoutes = require('./routes/clients');


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', itemRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/clients', clientsRoutes);


app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Catch-all to serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Database initialization
(async () => {
    try {
        await initDB();

        // --- Safe Migration for "code" column in branches ---
        const { getDB } = require('./db');
        const db = getDB();
        try {
            await db.execute("ALTER TABLE branches ADD COLUMN code TEXT");
            console.log("Migration: Added 'code' column to branches");
        } catch (e) {
            // Ignore error if column exists (SQLite throws if column exists)
        }

        // --- Seed Admin User if missing ---
        const userCountInitial = await db.execute("SELECT COUNT(*) as count FROM users");
        if (userCountInitial.rows[0].count === 0) {
            const crypto = require('crypto');
            const passHash = "sha256:" + crypto.createHash('sha256').update("admin123").digest('hex');
            const adminId = `usr_${Date.now()}`;
            await db.execute({
                sql: `INSERT INTO users (id, username, password_hash, full_name, role, email, active, perms, branch_id) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [adminId, 'admin', passHash, 'Administrador', 'admin', 'admin@sistema.com', 1, '{"all":true}', null]
            });
            console.log("Migration: Created default admin user (admin / admin123)");
        }

        console.log('Database initialized');
        app.listen(PORT, () => { // Changed 'port' to 'PORT' for consistency
            console.log(`Server running on port ${PORT}`); // Changed 'port' to 'PORT' for consistency
        });
    } catch (err) {
        console.error('Failed to initialize database:', err);
    }
})();
