import { pool } from '../configs/db.js';

async function checkCODOrders() {
  try {
    const res = await pool.query(`
      SELECT order_id, payment_method, payment_status, order_status, cod_fee
      FROM orders
      WHERE is_deleted = false AND payment_method = 'cod'
    `);
    console.log("COD Orders:", JSON.stringify(res.rows, null, 2));
    
    const statsRes = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE payment_method = 'cod') as cod_count,
        COUNT(*) FILTER (WHERE payment_method = 'cod' AND order_status != 'Cancelled' AND payment_status != 'Paid' AND order_status != 'Delivered') as pending_cod
      FROM orders
      WHERE is_deleted = false
    `);
    console.log("Stats:", statsRes.rows[0]);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCODOrders();
