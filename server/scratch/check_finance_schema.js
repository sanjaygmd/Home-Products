import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgres://postgres:Sanjay%40888016@localhost:5433/home_products"
});

async function checkSchema() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'finance_transactions'");
    console.log(res.rows.map(r => r.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
