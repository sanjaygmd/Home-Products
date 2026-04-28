import { pool } from './configs/db.js';

async function check() {
    const res = await pool.query(`
        SELECT conname, pg_get_constraintdef(oid) 
        FROM pg_constraint 
        WHERE conrelid = 'audit_logs'::regclass
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit();
}

check();
