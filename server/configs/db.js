import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const {Pool} = pg;
 
export const pool = new Pool({
    connectionString: process.env.DB_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
})

export const testDB = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("Database connection tested successfully.");
  } catch (err) {
    console.error("DB Connection Error:", err.message);
  }
};
