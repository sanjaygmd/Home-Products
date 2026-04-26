import { pool } from '../configs/db.js';

async function checkPaymentDistribution() {
  try {
    const res = await pool.query(`
      SELECT payment_method, payment_status, order_status, count(*) 
      FROM orders 
      WHERE is_deleted = false
      GROUP BY payment_method, payment_status, order_status
    `);
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkPaymentDistribution();
