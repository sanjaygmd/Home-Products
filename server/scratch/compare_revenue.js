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
    
    console.log("Dashboard Revenue:", dRes.rows[0].total_revenue);
    console.log("Payments Revenue:", pRes.rows[0].total_revenue);
    
    // Find orders that are in Payments but not in Dashboard
    const diffQuery = `
      SELECT order_id, total_amount, payment_method, payment_status, order_status, cod_fee
      FROM orders
      WHERE is_deleted = false AND order_status != 'Cancelled' AND (
        (payment_method != 'cod' AND cod_fee = 0) OR 
        (order_status = 'Delivered' OR payment_status = 'Paid')
      )
      AND NOT (payment_status = 'Paid' AND order_status != 'Cancelled')
    `;
    const diffRes = await pool.query(diffQuery);
    console.log("Orders counted in Payments but NOT in Dashboard:", JSON.stringify(diffRes.rows, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

compareRevenue();
