const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
    console.warn("WARNING: TURSO_DATABASE_URL is not set. Database operations will fail.");
}

const db = createClient({
    url: url || 'file:local.db',
    authToken: authToken,
});

module.exports = db;
