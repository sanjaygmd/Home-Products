import { pool } from '../configs/db.js';

export const runPaymentHardeningMigration = async () => {
    const client = await pool.connect();
    try {
        console.log('[MIGRATION] Starting Payment Hardening Migration...');
        await client.query('BEGIN');

        // 1. Create orphaned_payments table
        await client.query(`
            CREATE TABLE IF NOT EXISTS orphaned_payments (
                payment_id CHARACTER VARYING(255) PRIMARY KEY,
                razorpay_order_id CHARACTER VARYING(255),
                amount NUMERIC(12,2),
                status CHARACTER VARYING(50),
                notes TEXT,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Seed default platform fees in admin_settings if they don't exist
        const feeKeys = ['customer_platform_fee', 'seller_platform_fee'];
        for (const key of feeKeys) {
            const check = await client.query("SELECT 1 FROM admin_settings WHERE key = $1", [key]);
            if (check.rows.length === 0) {
                const defaultValue = key === 'customer_platform_fee' ? 10.00 : 15.00;
                await client.query(
                    "INSERT INTO admin_settings (key, value) VALUES ($1, $2)",
                    [key, JSON.stringify(defaultValue)]
                );
                console.log(`[MIGRATION] Seeded default value for ${key}: ${defaultValue}`);
            }
        }

        await client.query('COMMIT');
        console.log('[MIGRATION] Payment Hardening Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[MIGRATION ERROR] Payment Hardening failed:', err.message);
    } finally {
        client.release();
    }
};
