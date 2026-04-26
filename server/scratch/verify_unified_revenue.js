import { pool } from '../configs/db.js';

async function compareRevenue() {
  try {
    const unifiedCondition = `(payment_status = 'Paid' OR order_status = 'Delivered') AND order_status != 'Cancelled' AND is_deleted = false`;
    
    const dashboardQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue 
      FROM orders 
      WHERE ${unifiedCondition}
    `;
    
    const paymentsQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue 
      FROM orders 
      WHERE is_deleted = false AND order_status != 'Cancelled' AND (payment_status = 'Paid' OR order_status = 'Delivered')
    `;
    
    const dRes = await pool.query(dashboardQuery);
    const pRes = await pool.query(paymentsQuery);
    
    console.log("Unified Dashboard Total:", dRes.rows[0].total_revenue);
    console.log("Unified Payments Total:", pRes.rows[0].total_revenue);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

compareRevenue();
