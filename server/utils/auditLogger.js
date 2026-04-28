import { pool } from "../configs/db.js";

/**
 * Logs an administrative action to the audit_logs table.
 * 
 * @param {Object} params
 * @param {string} params.admin_id - UUID of the admin performing the action
 * @param {string} params.action - The action name (e.g., 'CREATE_COUPON', 'UPDATE_ORDER_STATUS')
 * @param {string} params.table_name - Affected database table
 * @param {string} params.record_id - UUID of the affected record
 * @param {Object} params.old_values - JSON snapshot before change
 * @param {Object} params.new_values - JSON snapshot after change
 * @param {Object} params.req - Express request object for IP and User-Agent tracking
 */
/**
 * Helper to log an action using the request context for user identity
 */
export const logAction = async (req, action, payload = {}) => {
    try {
        const user = req.user;
        if (!user) return; // Only log authenticated actions

        const userType = user.type || user.role;
        const isSuperAdmin = userType === 'super_admin';
        const userId = user.id || user.admin_id;

        const tableMap = {
            'ADD_PRODUCT': 'products',
            'UPDATE_PRODUCT': 'products',
            'DELETE_PRODUCT': 'products',
            'UPDATE_VARIANT': 'product_variants',
            'ADD_COUPON': 'coupons',
            'UPDATE_COUPON': 'coupons',
            'DELETE_COUPON': 'coupons',
            'LOGIN': 'auth'
        };

        const table_name = tableMap[action] || 'system';
        const record_id = payload.product_id || payload.variant_id || payload.coupon_id || null;
        
        // Extract IP and User Agent
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';
        const userAgent = req.get('User-Agent') || 'Server Process';


        await pool.query(
            `INSERT INTO audit_logs 
            (audit_id, admin_id, super_admin_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
                isSuperAdmin ? null : userId, 
                isSuperAdmin ? userId : null,
                action, 
                table_name, 
                record_id, 
                payload.old_values ? JSON.stringify(payload.old_values) : null, 
                payload.updates ? JSON.stringify(payload.updates) : JSON.stringify(payload), 
                ip, 
                userAgent
            ]
        );
        console.log(`[AUDIT] Action '${action}' recorded by ${user.email}`);
    } catch (err) {
        console.error("LOG ACTION FAILED:", err.message);
    }
};

/**
 * Legacy/Core log function
 */
export const logAudit = async ({ admin_id, action, table_name, record_id, old_values = null, new_values = null, req = null, is_super_admin = false }) => {
    // ... (rest of old logic is similar, but logAction is now preferred)
    try {
        const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || '0.0.0.0';
        const userAgent = req?.get('User-Agent') || 'Server Process';

        const userType = req?.user?.type || req?.user?.role;
        const isSuperAdmin = is_super_admin || userType === 'super_admin';

        await pool.query(
            `INSERT INTO audit_logs 
            (audit_id, admin_id, super_admin_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
                isSuperAdmin ? null : admin_id, 
                isSuperAdmin ? admin_id : null,
                action, 
                table_name, 
                record_id, 
                old_values ? JSON.stringify(old_values) : null, 
                new_values ? JSON.stringify(new_values) : null, 
                ip, 
                userAgent
            ]
        );
    } catch (err) { console.error(err); }
};
