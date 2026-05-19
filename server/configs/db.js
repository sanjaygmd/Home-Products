import pg from 'pg';
import dotenv from 'dotenv';



const {Pool} = pg;
 
export const pool = new Pool(
  process.env.DB_URL
    ? {
        connectionString: process.env.DB_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    : {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

export const testDB = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("Database connection tested successfully.");
  } catch (err) {
    console.error("DB Connection Error:", err.message);
  }
};
