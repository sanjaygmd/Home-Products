import { pool } from '../configs/db.js';

async function finalFix() {
    try {
        console.log("Updating enum values...");
        // Add values to transaction_type_enum (using the correct name found earlier)
        try { await pool.query("ALTER TYPE transaction_type_enum ADD VALUE 'order_payment'"); } catch(e) { console.log("order_payment already exists or error:", e.message); }
        try { await pool.query("ALTER TYPE transaction_type_enum ADD VALUE 'refund'"); } catch(e) { console.log("refund already exists or error:", e.message); }
        
        console.log("Backfilling missing transactions...");
        const res = await pool.query(`
            INSERT INTO finance_transactions (finance_transactions_id, order_id, payment_id, transaction_type, amount, created_at)
            SELECT gen_random_uuid(), p.order_id, p.payment_id, 'order_payment', p.amount, COALESCE(p.paid_at, NOW())
            FROM payments p
            WHERE p.payment_status = 'Paid'
            AND NOT EXISTS (
                SELECT 1 FROM finance_transactions ft WHERE ft.payment_id = p.payment_id
            )
        `);
        
        console.log(`Successfully backfilled ${res.rowCount} transactions.`);
        process.exit(0);
    } catch (err) {
        console.error("Final fix failed:", err);
        process.exit(1);
    }
}

finalFix();
