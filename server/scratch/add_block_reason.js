import { pool } from '../configs/db.js';

async function addBlockReason() {
  try {
    await pool.query(`ALTER TABLE sellers ADD COLUMN IF NOT EXISTS block_reason TEXT`);
    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS block_reason TEXT`);
    console.log("Column block_reason added to sellers and customers tables");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

addBlockReason();
