import { pool } from '../configs/db.js';

async function checkNullable() {
    try {
        const res = await pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'finance_transactions'");
        console.log("Finance Transactions Nullable:", res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkNullable();
