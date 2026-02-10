/**
 * Render Health Check Helper
 * Ensures the database connection is established correctly
 * when running on Render with environment variables.
 */

const { db, initDB } = require('./db');

async function checkHealth() {
    console.log("Health Check: Checking database connectivity...");
    try {
        await initDB();
        const result = await db.execute("SELECT 1");
        if (result) {
            console.log("Health Check: Database connected successfully.");
            return true;
        }
    } catch (err) {
        console.error("Health Check ERROR: Database connection failed.", err.message);
        if (err.message.includes("AUTH_TOKEN")) {
            console.error("Health Check ERROR: Missing or invalid TURSO_AUTH_TOKEN.");
        }
        return false;
    }
}

if (require.main === module) {
    checkHealth().then(ok => {
        if (!ok) process.exit(1);
    });
}

module.exports = { checkHealth };
