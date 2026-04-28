import { pool } from './configs/db.js';

async function check() {
    const res = await pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'notifications'");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit();
}

check();
