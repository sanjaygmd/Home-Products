import { pool } from '../configs/db.js';

async function checkFinanceSchema() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'finance_transactions'");
        console.log("Finance Transactions Columns:", res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkFinanceSchema();
