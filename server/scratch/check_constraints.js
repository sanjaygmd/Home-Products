import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgres://postgres:Sanjay@888016@localhost:5433/home_products'
});

async function checkConstraints() {
  try {
    const res = await pool.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'deliveries'::regclass;
    `);
    console.log("CONSTRAINTS ON 'deliveries':", res.rows);
  } catch (err) {
    console.error("DB ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkConstraints();
