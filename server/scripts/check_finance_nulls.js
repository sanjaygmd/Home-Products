import { pool } from '../configs/db.js';
import fs from 'fs';

async function check() {
    try {
        const res = await pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'finance_transactions'");
        fs.writeFileSync('finance_nulls.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('finance_nulls_error.txt', err.message);
        process.exit(1);
    }
}

check();
