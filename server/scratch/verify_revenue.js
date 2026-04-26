import { pool } from '../configs/db.js';

async function checkReturns() {
  try {
    const res = await pool.query(`SELECT COUNT(*) FROM return_requests`);
    console.log("Total return requests:", res.rows[0].count);
    
    const revenueRes = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue 
      FROM orders 
      WHERE payment_status = 'Paid' AND order_status != 'Cancelled' AND is_deleted = false
    `);
    console.log("Calculated Revenue:", revenueRes.rows[0].total_revenue);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkReturns();
