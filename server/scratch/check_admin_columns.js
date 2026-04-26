import { pool } from '../configs/db.js';

async function checkColumns() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('orders', 'customers', 'sellers') 
      AND column_name IN ('courier', 'tracking_id', 'estimated_delivery', 'block_reason')
    `);
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkColumns();
