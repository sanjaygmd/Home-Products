import { pool } from '../configs/db.js';
import crypto from 'crypto';

// Identifies user if token is present — does NOT block unauthenticated requests.
// Safe to use on public routes where auth is optional (e.g. product listings).
export const identifyUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const result = await pool.query(`
            SELECT s.*, a.name as admin_name, a.email as admin_email,
                   sel.store_name, sel.email as seller_email
            FROM auth_sessions s
            LEFT JOIN admins a ON s.user_ref_id = a.admin_id AND s.user_type = 'admin'
            LEFT JOIN sellers sel ON s.user_ref_id = sel.seller_id AND s.user_type = 'seller'
            WHERE s.token_hash = $1 AND s.expires_at > NOW() AND s.is_blacklisted = false
        `, [tokenHash]);

        if (result.rows.length > 0) {
            const session = result.rows[0];
            req.user = {
                id: session.user_ref_id,
                type: session.user_type,
                email: session.admin_email || session.seller_email,
                name: session.admin_name || session.store_name
            };
        }

        next();
    } catch (error) {
        console.error("IDENTIFY USER ERROR:", error.message);
        next();
    }
};

// Blocks unauthenticated requests with a 401.
// Alias for requireAuth() to maintain backward compatibility but enforce security.
export const verifyToken = (req, res, next) => requireAuth()(req, res, next);

// Blocks unauthenticated requests with a 401.
// Optionally enforces role-based access with a 403.
// Usage:  requireAuth()                 — any logged-in user
//         requireAuth(['admin'])        — admins only
//         requireAuth(['seller','admin'])— sellers or admins
export const requireAuth = (allowedRoles = []) => async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const result = await pool.query(`
            SELECT s.*, a.name as admin_name, a.email as admin_email,
                   sel.store_name, sel.email as seller_email
            FROM auth_sessions s
            LEFT JOIN admins a ON s.user_ref_id = a.admin_id AND s.user_type = 'admin'
            LEFT JOIN sellers sel ON s.user_ref_id = sel.seller_id AND s.user_type = 'seller'
            WHERE s.token_hash = $1 AND s.expires_at > NOW() AND s.is_blacklisted = false
        `, [tokenHash]);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid or expired session' });
        }

        const session = result.rows[0];
        req.user = {
            id: session.user_ref_id,
            type: session.user_type,
            email: session.admin_email || session.seller_email,
            name: session.admin_name || session.store_name
        };

        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.type)) {
            return res.status(403).json({ success: false, message: 'Insufficient permissions' });
        }

        next();
    } catch (error) {
        console.error("REQUIRE AUTH ERROR:", error.message);
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
};