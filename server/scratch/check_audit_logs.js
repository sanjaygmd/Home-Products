import { pool } from '../configs/db.js';

async function checkAuditLogs() {
  try {
    const res = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20");
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAuditLogs();
