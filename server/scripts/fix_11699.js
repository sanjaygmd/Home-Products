import { pool } from '../configs/db.js';

async function fixSpecific() {
    try {
        const res = await pool.query(`
            UPDATE seller_commissions 
            SET status = 'paid', payout_id = '41e4c524-b0aa-4cea-9c1b-e359dfa404ce'::uuid 
            WHERE seller_id = '723dcf4d-665d-4057-98fb-9fcc4bd9fa1c'::uuid
            AND ABS(seller_earnings - 11699.10) < 0.01 
            AND status = 'Pending'
        `);
        console.log(`Fixed ${res.rowCount} specific commissions.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixSpecific();
