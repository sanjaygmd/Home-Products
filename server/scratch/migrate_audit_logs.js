import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgres://postgres:Sanjay%40888016@localhost:5433/home_products"
});

async function migrate() {
  try {
    console.log("Dropping restrictive foreign key on audit_logs...");
    await pool.query("ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_admin_id_fkey;");
    
    console.log("Ensuring super_admin_id exists...");
    await pool.query("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS super_admin_id uuid;");
    
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
