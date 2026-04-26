import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'homedb',
  password: 'admin', // standard password in this env
  port: 5432,
});

async function checkOrders() {
  try {
    const res = await pool.query("SELECT order_id, order_status, payment_status, is_deleted FROM orders");
    console.log("ORDERS IN DB:", JSON.stringify(res.rows, null, 2));
    
    const items = await pool.query("SELECT SUM(quantity) as total FROM order_items oi JOIN orders o ON oi.order_id = o.order_id WHERE (o.payment_status = 'Paid' OR o.order_status = 'Delivered') AND o.order_status != 'Cancelled' AND o.is_deleted = false");
    console.log("TOTAL ITEMS SOLD (CURRENT LOGIC):", items.rows[0].total);

    const delivered = await pool.query("SELECT SUM(quantity) as total FROM order_items oi JOIN orders o ON oi.order_id = o.order_id WHERE o.order_status = 'Delivered' AND o.is_deleted = false");
    console.log("TOTAL ITEMS DELIVERED:", delivered.rows[0].total);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkOrders();
