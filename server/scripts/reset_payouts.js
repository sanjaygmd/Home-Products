import { pool } from '../configs/db.js';

async function resetPayouts() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Resetting payout system...");

        // 1. Delete all finance transactions related to payouts
        const delFinance = await client.query("DELETE FROM finance_transactions WHERE seller_payout_id IS NOT NULL OR transaction_type = 'payout'");
        console.log(`Deleted ${delFinance.rowCount} finance transaction records.`);

        // 2. Delete all seller payout records
        const delPayouts = await client.query("DELETE FROM seller_payouts");
        console.log(`Deleted ${delPayouts.rowCount} payout records.`);

        // 3. Reset all seller commissions to 'Pending'
        // We only reset those that are not 'Cancelled' or something else if applicable
        const updateCommissions = await client.query("UPDATE seller_commissions SET status = 'Pending' WHERE status IN ('Paid', 'Processing', 'Requested')");
        console.log(`Reset ${updateCommissions.rowCount} commissions to 'Pending'.`);

        await client.query('COMMIT');
        console.log("System reset successfully.");
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Reset failed:", err);
        process.exit(1);
    } finally {
        client.release();
    }
}

resetPayouts();
