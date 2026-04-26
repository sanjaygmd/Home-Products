import { pool } from '../configs/db.js';
import fs from 'fs';

async function check() {
    try {
        const report = {};
        
        const cols = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'finance_transactions'
        `);
        report.columns = cols.rows;
        
        const constraints = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid) as def 
            FROM pg_constraint 
            WHERE conrelid = 'finance_transactions'::regclass
        `);
        report.constraints = constraints.rows;
        
        fs.writeFileSync('finance_full_report.json', JSON.stringify(report, null, 2));
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('finance_full_report_error.txt', err.message);
        process.exit(1);
    }
}

check();
