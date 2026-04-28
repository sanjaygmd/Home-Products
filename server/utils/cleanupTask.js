import { pool } from '../configs/db.js';

/**
 * Prunes expired auth sessions and OTP verifications from the database.
 * Recommended to run this on server startup or via a scheduled cron job.
 */
export const pruneExpiredRecords = async () => {
    try {
        console.log("[CLEANUP] Starting database maintenance...");

        // 1. Delete expired sessions
        const sessionRes = await pool.query(
            "DELETE FROM auth_sessions WHERE expires_at < NOW() RETURNING session_id"
        );
        if (sessionRes.rowCount > 0) {
            console.log(`[CLEANUP] Removed ${sessionRes.rowCount} expired auth sessions.`);
        }

        // 2. Delete expired OTPs
        const otpRes = await pool.query(
            "DELETE FROM otp_verifications WHERE expires_at < NOW() RETURNING otp_id"
        );
        if (otpRes.rowCount > 0) {
            console.log(`[CLEANUP] Removed ${otpRes.rowCount} expired OTP records.`);
        }

        // 3. Optional: Delete very old audit logs (e.g., older than 1 year)
        // const auditRes = await pool.query("DELETE FROM audit_logs WHERE created_at < NOW() - interval '1 year'");

        console.log("[CLEANUP] Database maintenance completed.");
    } catch (error) {
        console.error("[CLEANUP] Maintenance Error:", error.message);
    }
};
