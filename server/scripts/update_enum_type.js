import { pool } from '../configs/db.js';

async function updateEnum() {
    try {
        await pool.query("ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'order_payment'");
        console.log("Enum updated successfully.");
        process.exit(0);
    } catch (err) {
        // If IF NOT EXISTS is not supported, we catch the error
        if (err.message.includes("already exists")) {
            console.log("Enum already exists.");
            process.exit(0);
        }
        console.error(err);
        process.exit(1);
    }
}

updateEnum();
