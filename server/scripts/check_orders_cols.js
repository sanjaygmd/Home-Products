import { pool } from '../configs/db.js';

async function checkOrdersColumns() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'");
        console.log("Orders Columns:", res.rows.map(r => r.column_name));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkOrdersColumns();
