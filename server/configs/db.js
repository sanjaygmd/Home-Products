import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const {Pool} = pg;
 
export const pool = new Pool({
    connectionString: process.env.DB_URL,
})

export const testDB = async () => {
  try {
    await pool.query("SELECT NOW()");

    
    // Ensure Shiprocket tracking table exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS shiprocket_orders (
            id SERIAL PRIMARY KEY,
            order_id VARCHAR(255) NOT NULL UNIQUE,
            sr_order_id VARCHAR(255) NOT NULL,
            shipment_id VARCHAR(255) NOT NULL,
            awb_code VARCHAR(255),
            courier_name VARCHAR(255),
            sr_status VARCHAR(50) DEFAULT 'NEW',
            sr_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    

    
  } catch (err) {
    console.error("DB Error:", err.message);
  }
};
