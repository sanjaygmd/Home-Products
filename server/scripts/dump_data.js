import { pool } from '../configs/db.js';

async function dump() {
    try {
        const sellerId = '723dcf4d-665d-4057-98fb-9fcc4bd9fa1c';
        
        const comms = await pool.query("SELECT created_at, status, seller_earnings FROM seller_commissions WHERE seller_id = $1 LIMIT 5", [sellerId]);
        const pays = await pool.query("SELECT payout_id, payout_period_start, payout_period_end, status FROM seller_payouts WHERE seller_id = $1 LIMIT 5", [sellerId]);
        
        console.log("COMMISSIONS:");
        console.log(JSON.stringify(comms.rows, null, 2));
        
        console.log("PAYOUTS:");
        console.log(JSON.stringify(pays.rows, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

dump();
