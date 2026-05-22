const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Force HTTPS protocol for better compatibility in serverless envs
const rawUrl = process.env.TURSO_DATABASE_URL;
const url = rawUrl ? rawUrl.replace("libsql://", "https://") : undefined;
const authToken = process.env.TURSO_AUTH_TOKEN;

let usingTurso = false;
let dbStatus = 'unknown';

if (!url) {
    console.warn("⚠️  TURSO_DATABASE_URL is not set. Using local SQLite database.");
    dbStatus = 'using-local';
} else if (!authToken) {
    console.warn("⚠️  TURSO_AUTH_TOKEN is not set. Using local SQLite database.");
    dbStatus = 'using-local';
} else {
    usingTurso = true;
    dbStatus = 'using-turso';
    console.log("✓ Using Turso remote database");
}

const db = createClient({
    url: url || 'file:local.db',
    authToken: authToken || undefined,
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

// Helper function to safely execute queries with fallback behavior
async function safeExecute(query) {
    try {
        return await db.execute(query);
    } catch (err) {
        console.error('DB Error:', err.message);
        console.error('Query:', typeof query === 'string' ? query.substring(0, 100) : query.sql?.substring(0, 100));
        throw err;
    }
}

function getDBStatus() {
    return {
        status: dbStatus,
        tursoEnabled: usingTurso,
        localDbPath: 'file:local.db'
    };
}

module.exports = { db, initDB, getDB, safeExecute, getDBStatus };
