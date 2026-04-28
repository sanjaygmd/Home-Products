import { pool } from './configs/db.js';

async function check() {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'auth_sessions'");
    console.log("Columns in auth_sessions:", res.rows.map(r => r.column_name).join(", "));
    process.exit();
}

check();
