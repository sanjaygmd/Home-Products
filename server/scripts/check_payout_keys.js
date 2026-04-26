import { pool } from '../configs/db.js';
import fs from 'fs';

async function check() {
    try {
        const res = await pool.query("SELECT * FROM seller_payouts LIMIT 1");
        if (res.rows.length > 0) {
            fs.writeFileSync('payout_keys.json', JSON.stringify(Object.keys(res.rows[0]), null, 2));
        } else {
            fs.writeFileSync('payout_keys.json', JSON.stringify(["TABLE EMPTY"], null, 2));
        }
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('payout_keys_error.txt', err.message);
        process.exit(1);
    }
}

check();
