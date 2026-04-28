import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgres://postgres:Sanjay%40888016@localhost:5433/home_products"
});

async function createSuperAdminTable() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS public.super_admins (
          super_admin_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name character varying(255),
          email character varying(255) UNIQUE NOT NULL,
          password_hash text NOT NULL,
          role character varying(50) DEFAULT 'super_admin',
          permissions jsonb DEFAULT '{}',
          is_active boolean DEFAULT true,
          last_login_at timestamp without time zone,
          created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);
    console.log("Super Admin table created successfully.");
  } catch (err) {
    console.error("Error creating Super Admin table:", err.message);
  } finally {
    await pool.end();
  }
}

createSuperAdminTable();
