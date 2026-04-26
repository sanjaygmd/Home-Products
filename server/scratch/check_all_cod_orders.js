import { pool } from '../configs/db.js';

async function checkAllCODOrders() {
  try {
    const res = await pool.query(`
      SELECT order_id, payment_method, payment_status, order_status, cod_fee, is_deleted
      FROM orders
      WHERE payment_method = 'cod'
    `);
    console.log("All COD Orders (including deleted):", JSON.stringify(res.rows, null, 2));
    
    const methodCount = await pool.query(`
      SELECT payment_method, COUNT(*) 
      FROM orders 
      GROUP BY payment_method
    `);
    console.log("Payment Method Distribution:", methodCount.rows);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAllCODOrders();
