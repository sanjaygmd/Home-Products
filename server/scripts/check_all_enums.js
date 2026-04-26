import { pool } from '../configs/db.js';
import fs from 'fs';

async function check() {
    try {
        const res = await pool.query("SELECT t.typname, e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid");
        fs.writeFileSync('all_enums.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('all_enums_error.txt', err.message);
        process.exit(1);
    }
}

check();
