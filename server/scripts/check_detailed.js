import { pool } from '../configs/db.js';
import fs from 'fs';

async function checkDetailed() {
    try {
        const res = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                is_nullable, 
                column_default 
            FROM information_schema.columns 
            WHERE table_name = 'finance_transactions'
        `);
        fs.writeFileSync('detailed_schema.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('detailed_schema_error.txt', err.message);
        process.exit(1);
    }
}

checkDetailed();
