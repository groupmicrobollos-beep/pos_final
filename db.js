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

const fs = require('fs');
const path = require('path');

async function initDB() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolon to handle multiple statements (basic support)
        const statements = schema.split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Running migration... (${statements.length} statements)`);

        for (const sql of statements) {
            await db.execute(sql);
        }
        console.log("Migration completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
        // Don't crash process, allows server to start even if db has issues (though routes will fail)
    }
}

module.exports = { db, initDB };
