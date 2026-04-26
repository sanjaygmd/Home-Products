import { pool } from '../configs/db.js';

async function cleanup() {
    try {
        console.log("Starting commission status cleanup...");
        
        // Find all paid payouts and ensure their commissions are marked as 'paid'
        const paidPayouts = await pool.query("SELECT payout_id, seller_id, payout_period_start, payout_period_end FROM seller_payouts WHERE status = 'Paid'");
        
        for (const payout of paidPayouts.rows) {
            const result = await pool.query(`
                UPDATE seller_commissions 
                SET status = 'paid' 
                WHERE seller_id = $1 
                AND LOWER(status) IN ('pending', 'processing')
                AND created_at >= $2 
                AND created_at <= $3
            `, [payout.seller_id, payout.payout_period_start, payout.payout_period_end]);
            
            console.log(`Payout ${payout.payout_id}: Updated ${result.rowCount} commissions to 'paid'.`);
        }
        
        console.log("Cleanup completed.");
        process.exit(0);
    } catch (err) {
        console.error("Cleanup failed:", err);
        process.exit(1);
    }
}

cleanup();
