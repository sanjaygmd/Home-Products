import { pool } from '../configs/db.js';

async function checkHistory() {
  try {
    const orderIdRes = await pool.query(`SELECT order_id FROM orders WHERE payment_method = 'Prepaid' AND payment_status = 'Pending' LIMIT 1`);
    if (orderIdRes.rows.length === 0) {
      console.log("No orders found");
      process.exit(0);
    }
    const order_id = orderIdRes.rows[0].order_id;
    const res = await pool.query("SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC", [order_id]);
    console.log(`History for ${order_id}:`, res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkHistory();
