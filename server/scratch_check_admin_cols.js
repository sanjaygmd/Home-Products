import { pool } from './configs/db.js';

async function check() {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'admins'");
    console.log(JSON.stringify(res.rows.map(r => r.column_name), null, 2));
    process.exit();
}

check();
