import { pool } from '../configs/db.js';

async function sumComms() {
    try {
        const sellerId = '723dcf4d-665d-4057-98fb-9fcc4bd9fa1c';
        const res = await pool.query("SELECT seller_earnings, created_at, status FROM seller_commissions WHERE seller_id = $1 AND LOWER(status) = 'pending'", [sellerId]);
        
        let total = 0;
        res.rows.forEach(r => {
            total += parseFloat(r.seller_earnings);
            console.log(`Earned: ${r.seller_earnings} on ${r.created_at}`);
        });
        
        console.log(`TOTAL PENDING: ${total}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

sumComms();
