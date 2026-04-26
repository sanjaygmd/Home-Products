import { pool } from '../configs/db.js';

async function verifyAuditFixes() {
  try {
    console.log("--- Verifying Sellers Data ---");
    const sellersRes = await pool.query("SELECT seller_id, is_active, block_reason FROM sellers WHERE is_active = false LIMIT 1");
    if (sellersRes.rows.length > 0) {
      console.log("Found a blocked seller:", sellersRes.rows[0]);
    } else {
      console.log("No blocked sellers found in DB to verify block_reason.");
    }

    console.log("\n--- Verifying Customers Data ---");
    const customersRes = await pool.query("SELECT customer_id, is_active, block_reason FROM customers WHERE is_active = false LIMIT 1");
    if (customersRes.rows.length > 0) {
      console.log("Found a blocked customer:", customersRes.rows[0]);
    } else {
      console.log("No blocked customers found in DB to verify block_reason.");
    }

    console.log("\n--- Verifying Order Logistics Columns ---");
    const orderRes = await pool.query("SELECT order_id, courier, tracking_id, estimated_delivery FROM orders LIMIT 1");
    console.log("Order structure check:", orderRes.rows[0]);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verifyAuditFixes();
