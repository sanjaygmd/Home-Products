import { pool } from '../configs/db.js';

async function checkCODFees() {
  try {
    const res = await pool.query(`
      SELECT order_id, payment_method, payment_status, order_status, cod_fee
      FROM orders 
      WHERE payment_method = 'Prepaid' AND payment_status = 'Pending'
    `);
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCODFees();
