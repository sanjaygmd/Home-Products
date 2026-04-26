import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgres://postgres:Sanjay@888016@localhost:5433/home_products'
});

async function addUniqueConstraint() {
  try {
    console.log("Adding unique constraint to 'deliveries' table...");
    await pool.query("ALTER TABLE deliveries ADD CONSTRAINT unique_order_id UNIQUE (order_id)");
    console.log("Constraint added successfully.");
  } catch (err) {
    console.error("DB ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

addUniqueConstraint();
