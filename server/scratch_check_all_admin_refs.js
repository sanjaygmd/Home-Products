import { pool } from './configs/db.js';

async function check() {
    const res = await pool.query(`
        SELECT conname, conrelid::regclass as table_name
        FROM pg_constraint 
        WHERE confrelid = 'admins'::regclass
    `);
    console.log("Tables referencing 'admins':", JSON.stringify(res.rows, null, 2));
    process.exit();
}

check();
