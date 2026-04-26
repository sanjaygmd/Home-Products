import { pool } from './configs/db.js';
async function check() {
  const res = await pool.query(`SELECT is_nullable FROM information_schema.columns WHERE table_name='products' AND column_name='seller_id'`);
  console.log("Is Nullable:", res.rows[0]?.is_nullable);
  process.exit();
}
check();
