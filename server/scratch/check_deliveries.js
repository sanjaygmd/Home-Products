import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgres://postgres:Sanjay@888016@localhost:5433/home_products'
});

async function listTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("TABLES IN DB:", res.rows.map(r => r.table_name));
    
    const hasDeliveries = res.rows.some(r => r.table_name === 'deliveries');
    if (hasDeliveries) {
      console.log("Found 'deliveries' table!");
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'deliveries'
      `);
      console.log("COLUMNS IN 'deliveries':", cols.rows);
      
      const data = await pool.query("SELECT * FROM deliveries");
      console.log("DATA IN 'deliveries' (Count):", data.rows.length);
      console.log("DATA:", JSON.stringify(data.rows, null, 2));
    } else {
      console.log("'deliveries' table NOT FOUND in public schema.");
    }

  } catch (err) {
    console.error("DB ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

listTables();
