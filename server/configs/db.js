import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const {Pool} = pg;
 
export const pool = new Pool({
    connectionString: process.env.DB_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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

    // Ensure persistent OTP table exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS persistent_otps (
            email VARCHAR(255) NOT NULL,
            otp_type VARCHAR(50) NOT NULL,
            otp_code VARCHAR(255) NOT NULL,
            attempts INT DEFAULT 0,
            metadata JSONB DEFAULT '{}',
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (email, otp_type)
        );
    `);
    
    // Ensure last_accessed_at column exists on auth_sessions table
    await pool.query(`
        ALTER TABLE auth_sessions 
        ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // Ensure discount_amount column exists on coupons table
    await pool.query(`
        ALTER TABLE coupons 
        ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0.00
    `);
    

    
  } catch (err) {
    console.error("DB Error:", err.message);
  }
};
