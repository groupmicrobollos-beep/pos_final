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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', itemRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/suppliers', supplierRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Catch-all to serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize DB then start server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
