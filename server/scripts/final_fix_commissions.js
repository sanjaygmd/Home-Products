import { pool } from '../configs/db.js';

async function finalFix() {
    try {
        const res = await pool.query(`
            UPDATE seller_commissions sc 
            SET status = 'paid' 
            FROM seller_payouts sp 
            WHERE sc.payout_id = sp.payout_id 
            AND sp.status = 'Paid'
        `);
        console.log(`Final fix: Updated ${res.rowCount} commissions to 'paid'.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

finalFix();
