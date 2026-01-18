const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Force HTTPS protocol for better compatibility in serverless envs
const rawUrl = process.env.TURSO_DATABASE_URL;
const url = rawUrl ? rawUrl.replace("libsql://", "https://") : undefined;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
    console.warn("WARNING: TURSO_DATABASE_URL is not set. Database operations will fail.");
}

const db = createClient({
    url: url || 'file:local.db',
    authToken: authToken,
});

async function initDB() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Remove comments (single line and block) to avoid empty statement errors
        const cleanSchema = schema
            .replace(/--.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');

        // Split by semicolon and filter empty lines
        const statements = cleanSchema.split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Running migration... (${statements.length} statements)`);

        for (const sql of statements) {
            await db.execute(sql);
        }
        console.log("Migration completed successfully.");
    } catch (err) {
        console.error("Migration failed details:", err);
        // Log but don't crash, let the app try to run
    }
}

const getDB = () => db;

module.exports = { db, initDB, getDB };
