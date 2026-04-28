import { pool } from './configs/db.js';

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, column_default, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'auth_sessions'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
