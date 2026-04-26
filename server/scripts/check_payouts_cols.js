import { pool } from '../configs/db.js';
import fs from 'fs';

async function check() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'seller_payouts'");
        fs.writeFileSync('seller_payouts_cols.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('seller_payouts_error.txt', err.message);
        process.exit(1);
    }
}

check();
