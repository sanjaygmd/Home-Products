import { pool } from './configs/db.js';

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Updating audit_logs_admin_id_fkey...");
        await client.query(`
            ALTER TABLE audit_logs 
            DROP CONSTRAINT audit_logs_admin_id_fkey,
            ADD CONSTRAINT audit_logs_admin_id_fkey 
            FOREIGN KEY (admin_id) REFERENCES admins(admin_id) 
            ON DELETE SET NULL
        `);

        console.log("Updating audit_logs_super_admin_id_fkey...");
        await client.query(`
            ALTER TABLE audit_logs 
            DROP CONSTRAINT audit_logs_super_admin_id_fkey,
            ADD CONSTRAINT audit_logs_super_admin_id_fkey 
            FOREIGN KEY (super_admin_id) REFERENCES super_admins(super_admin_id) 
            ON DELETE SET NULL
        `);

        await client.query('COMMIT');
        console.log("Successfully updated audit_logs foreign key constraints to ON DELETE SET NULL.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", err.message);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
