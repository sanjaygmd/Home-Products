import { pool } from '../configs/db.js';

async function updateEnumFull() {
    try {
        // Postgres ALTER TYPE ADD VALUE cannot run inside a transaction block in some versions
        try { await pool.query("ALTER TYPE transaction_type ADD VALUE 'order_payment'"); } catch(e) {}
        try { await pool.query("ALTER TYPE transaction_type ADD VALUE 'refund'"); } catch(e) {}
        console.log("Enums checked.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateEnumFull();
