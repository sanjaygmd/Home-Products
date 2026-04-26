import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  try {
    console.log('Checking columns for table: products');
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `);
    console.log('Columns:', res.rows.map(r => r.column_name).join(', '));
    
    console.log('\nChecking columns for table: orders');
    const res2 = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
    `);
    console.log('Columns:', res2.rows.map(r => r.column_name).join(', '));

    await pool.end();
  } catch (err) {
    console.error(err);
  }
}

checkSchema();
