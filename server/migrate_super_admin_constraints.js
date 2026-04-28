import { pool } from './configs/db.js';

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const constraints = [
            { table: 'audit_logs', con: 'audit_logs_super_admin_id_fkey', col: 'super_admin_id', ref: 'super_admins(super_admin_id)', action: 'SET NULL' }
        ];

        for (const c of constraints) {
            console.log(`Updating constraint ${c.con} on table ${c.table}...`);
            await client.query(`ALTER TABLE ${c.table} DROP CONSTRAINT IF EXISTS ${c.con}`);
            await client.query(`
                ALTER TABLE ${c.table} 
                ADD CONSTRAINT ${c.con} 
                FOREIGN KEY (${c.col}) REFERENCES ${c.ref} 
                ON DELETE ${c.action}
            `);
        }

        await client.query('COMMIT');
        console.log("Successfully updated super_admin foreign key constraints.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", err.message);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
