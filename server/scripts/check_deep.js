import { pool } from '../configs/db.js';
import fs from 'fs';

async function checkDeep() {
    try {
        const columns = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'finance_transactions'
        `);
        const constraints = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid) as def 
            FROM pg_constraint 
            WHERE conrelid = 'finance_transactions'::regclass
        `);
        
        const report = {
            columns: columns.rows,
            constraints: constraints.rows
        };
        
        fs.writeFileSync('finance_report.json', JSON.stringify(report, null, 2));
        console.log("Report generated.");
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('finance_report_error.txt', err.message);
        console.error(err);
        process.exit(1);
    }
}

checkDeep();
