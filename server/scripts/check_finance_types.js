import { pool } from '../configs/db.js';
import fs from 'fs';

async function check() {
    try {
        const res = await pool.query("SELECT DISTINCT transaction_type FROM finance_transactions");
        fs.writeFileSync('finance_types.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('finance_types_error.txt', err.message);
        process.exit(1);
    }
}

check();
