import { pool } from './configs/db.js';

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const constraints = [
            { table: 'bank_accounts', con: 'bank_accounts_verified_by_admin_id_fkey', col: 'verified_by_admin_id', ref: 'admins(admin_id)', action: 'SET NULL' },
            { table: 'categories', con: 'categories_admin_id_fkey', col: 'admin_id', ref: 'admins(admin_id)', action: 'SET NULL' },
            { table: 'coupons', con: 'coupons_admin_id_fkey', col: 'admin_id', ref: 'admins(admin_id)', action: 'SET NULL' },
            { table: 'seller_payouts', con: 'seller_payouts_initiated_by_admin_id_fkey', col: 'initiated_by_admin_id', ref: 'admins(admin_id)', action: 'SET NULL' },
            { table: 'return_requests', con: 'return_requests_resolved_by_admin_id_fkey', col: 'resolved_by_admin_id', ref: 'admins(admin_id)', action: 'SET NULL' },
            { table: 'notifications', con: 'notifications_admin_id_fkey', col: 'admin_id', ref: 'admins(admin_id)', action: 'SET NULL' },
            { table: 'admin_settings', con: 'admin_settings_admin_id_fkey', col: 'admin_id', ref: 'admins(admin_id)', action: 'CASCADE' },
            { table: 'admins', con: 'admins_created_by_admin_fkey', col: 'created_by_admin', ref: 'admins(admin_id)', action: 'SET NULL' }
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
        console.log("Successfully updated all admin-related foreign key constraints.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", err.message);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
