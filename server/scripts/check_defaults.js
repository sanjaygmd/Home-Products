import { pool } from '../configs/db.js';

async function checkDefault() {
    try {
        const res = await pool.query("SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'seller_payouts'");
        console.log("Seller Payouts Defaults:", res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDefault();
