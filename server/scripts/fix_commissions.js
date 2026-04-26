import { pool } from '../configs/db.js';

async function fixCommissions() {
    try {
        console.log("Starting commission status cleanup...");
        
        // 1. Revert commissions to 'Pending' if they are 'Paid' but the order is 'Delivered' 
        // AND they are not linked to any 'Paid' payout record.
        // Wait, currently seller_commissions are not explicitly linked to payout_id in the table (it's implicit by period).
        // So we'll revert ALL 'Paid' commissions to 'Pending' if there are 0 payout records in 'Paid' status.
        
        const payoutCount = await pool.query("SELECT COUNT(*) FROM seller_payouts WHERE status = 'Paid'");
        const totalPayouts = parseInt(payoutCount.rows[0].count);
        
        if (totalPayouts === 0) {
            console.log("No 'Paid' payouts found. Reverting all 'Paid' commissions to 'Pending'...");
            const updateRes = await pool.query("UPDATE seller_commissions SET status = 'Pending' WHERE status = 'Paid'");
            console.log(`Updated ${updateRes.rowCount} commissions to 'Pending'.`);
        } else {
            console.log(`${totalPayouts} 'Paid' payouts found. Skipping bulk revert to avoid data corruption.`);
            // More granular check: Commissions where order is delivered should be pending if no payout covers them.
            // But since this is a new feature, most 'Paid' statuses are probably from the old auto-pay logic.
        }

        console.log("Cleanup complete.");
        process.exit(0);
    } catch (err) {
        console.error("Cleanup failed:", err);
        process.exit(1);
    }
}

fixCommissions();
