import { pool } from '../configs/db.js';

async function compareRevenue() {
  try {
    const dashboardQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue 
      FROM orders 
      WHERE payment_status = 'Paid' AND order_status != 'Cancelled' AND is_deleted = false
    `;
    
    const paymentsQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue 
      FROM orders 
      WHERE is_deleted = false AND order_status != 'Cancelled' AND (
        (payment_method != 'cod' AND cod_fee = 0) OR 
        (order_status = 'Delivered' OR payment_status = 'Paid')
      )
    `;
    
    const dRes = await pool.query(dashboardQuery);
    const pRes = await pool.query(paymentsQuery);
    
    console.log("Dashboard Total:", dRes.rows[0].total_revenue);
    console.log("Payments Total:", pRes.rows[0].total_revenue);
    
    const diffQuery = `
      SELECT COUNT(*) as count, SUM(total_amount) as amount
      FROM orders
      WHERE is_deleted = false AND order_status != 'Cancelled' AND (
        (payment_method != 'cod' AND cod_fee = 0) OR 
        (order_status = 'Delivered' OR payment_status = 'Paid')
      )
      AND NOT (payment_status = 'Paid' AND order_status != 'Cancelled')
    `;
    const diffRes = await pool.query(diffQuery);
    console.log("Difference Count:", diffRes.rows[0].count);
    console.log("Difference Amount:", diffRes.rows[0].amount);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

compareRevenue();
