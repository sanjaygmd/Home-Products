import { pool } from '../configs/db.js';
import fs from 'fs';

async function check() {
    try {
        const res = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid) as def 
            FROM pg_constraint 
            WHERE conrelid = 'seller_payouts'::regclass 
            AND contype = 'c'
        `);
        fs.writeFileSync('payouts_constraints.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('payouts_constraints_error.txt', err.message);
        process.exit(1);
    }
}

check();
