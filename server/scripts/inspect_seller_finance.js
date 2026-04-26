import { pool } from '../configs/db.js';

async function inspect() {
    try {
        const sellerId = '723dcf4d-665d-4057-98fb-9fcc4bd9fa1c'; // Hardcoded for debugging based on previous logs
        
        console.log("--- SELLER PAYOUTS ---");
        const payouts = await pool.query("SELECT * FROM seller_payouts WHERE seller_id = $1", [sellerId]);
        console.table(payouts.rows);
        
        console.log("--- SELLER COMMISSIONS STATUS SUMMARY ---");
        const summary = await pool.query("SELECT status, COUNT(*), SUM(seller_earnings) FROM seller_commissions WHERE seller_id = $1 GROUP BY status", [sellerId]);
        console.table(summary.rows);
        
        console.log("--- DETAILED COMMISSIONS (PENDING/PROCESSING) ---");
        const detailed = await pool.query(`
            SELECT sc.commission_id, sc.status, sc.seller_earnings, sc.created_at, o.order_status
            FROM seller_commissions sc
            JOIN orders o ON sc.order_id = o.order_id
            WHERE sc.seller_id = $1 AND LOWER(sc.status) IN ('pending', 'processing')
        `, [sellerId]);
        console.table(detailed.rows);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
