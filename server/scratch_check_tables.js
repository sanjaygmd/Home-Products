import { pool } from './configs/db.js';

async function checkTables() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log("Tables in public schema:", result.rows.map(r => r.table_name).join(", "));
        
        // Specifically check audit_logs
        const auditLogs = await pool.query("SELECT COUNT(*) FROM audit_logs");
        console.log("Audit Logs Count:", auditLogs.rows[0].count);
        
        process.exit(0);
    } catch (err) {
        console.error("Table check error:", err.message);
        process.exit(1);
    }
}

checkTables();
