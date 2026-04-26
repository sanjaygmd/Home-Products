import { pool } from '../configs/db.js';

async function sync() {
    try {
        console.log("Syncing existing payouts to commissions...");
        
        // Find all payouts
        const payouts = await pool.query("SELECT payout_id, seller_id, payout_period_start, payout_period_end FROM seller_payouts");
        
        for (const payout of payouts.rows) {
            const result = await pool.query(`
                UPDATE seller_commissions 
                SET payout_id = $1::uuid 
                WHERE seller_id = $2::uuid 
                AND created_at >= $3 
                AND created_at <= $4
                AND payout_id IS NULL
            `, [payout.payout_id, payout.seller_id, payout.payout_period_start, payout.payout_period_end]);
            
            console.log(`Linked ${result.rowCount} commissions to payout ${payout.payout_id}`);
        }
        
        console.log("Sync completed.");
        process.exit(0);
    } catch (err) {
        console.error("Sync failed:", err);
        process.exit(1);
    }
}

sync();
