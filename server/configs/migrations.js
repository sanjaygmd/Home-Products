import { pool } from './db.js';

/**
 * Migration runner to manage table structures and dynamically run migrations.
 * Decoupled from core startup connection test.
 */
export const runSchemaMigrations = async () => {
  console.log("[MIGRATOR] Starting schema migrations...");
  try {
    // 1. Ensure Shiprocket tracking table exists
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

    // 2. Ensure persistent OTP table exists
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
    
    // 3. Ensure last_accessed_at and sudo_verified_at columns exist on auth_sessions table
    await pool.query(`
        ALTER TABLE auth_sessions 
        ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS sudo_verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // 4. Ensure discount_amount column exists on coupons table
    await pool.query(`
        ALTER TABLE coupons 
        ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0.00
    `);

    // 5. Ensure system_config table exists with default commission_rate
    await pool.query(`
        CREATE TABLE IF NOT EXISTS system_config (
            key VARCHAR(255) PRIMARY KEY,
            value VARCHAR(255) NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        INSERT INTO system_config (key, value)
        VALUES ('commission_rate', '0.10')
        ON CONFLICT (key) DO NOTHING;
    `);

    // 6. Ensure sellers table has a custom commission_rate column
    await pool.query(`
        ALTER TABLE sellers 
        ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT NULL
    `);

    // 7. Ensure user_profile column exists on auth_sessions table
    await pool.query(`
        ALTER TABLE auth_sessions 
        ADD COLUMN IF NOT EXISTS user_profile JSONB DEFAULT '{}'::jsonb
    `);

    // 8. Ensure unique coupon customer constraint is applied to pre-existing tables safely
    try {
      await pool.query(`
          ALTER TABLE coupon_usage 
          ADD CONSTRAINT unique_coupon_customer UNIQUE (coupon_id, customer_id)
      `);
      console.log("[MIGRATOR] unique_coupon_customer constraint added successfully");
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.warn("[MIGRATOR] Warning when adding unique_coupon_customer constraint:", err.message);
      }
    }

    // 9. Ensure chatbot history table exists for secure server-side conversation history tracking
    await pool.query(`
        CREATE TABLE IF NOT EXISTS chatbot_history (
            id UUID PRIMARY KEY,
            session_id VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_chatbot_history_session_id ON chatbot_history(session_id);
    `);

    console.log("[MIGRATOR] All schema migrations ran successfully.");
  } catch (err) {
    console.error("[MIGRATOR] Schema migrations FAILED:", err.message);
    throw err;
  }
};
