import { pool } from '../configs/db.js';

async function checkFinanceTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('daily_finances', 'weekly_finances', 'month_finances', 'quarterly_finances', 'half_yearly_finances', 'annual_finances')
    `);
    console.log("Finance tables found:", res.rows.map(r => r.table_name));

    for (const table of res.rows.map(r => r.table_name)) {
      const count = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table} count:`, count.rows[0].count);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkFinanceTables();
