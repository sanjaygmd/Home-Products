import { pool } from '../configs/db.js';

async function checkPayout() {
    try {
        const res = await pool.query("SELECT amount, status, payout_period_start, payout_period_end FROM seller_payouts WHERE payout_id = '41e4c524-b0aa-4cea-9c1b-e359dfa404ce'");
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkPayout();
