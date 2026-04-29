import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pool } from '../configs/db.js';



/**
 * Middleware to verify session token and check roles
 * Supports multiple concurrent sessions (admin, seller, customer) via role-specific cookies
 */
export const requireAuth = (allowedRoles = []) => async (req, res, next) => {
    try {
        const tokens = [];
        const authHeader = req.headers.authorization;
        
        // 1. Collect all potential tokens from headers and cookies
        if (authHeader && authHeader.startsWith('Bearer ')) {
            tokens.push(authHeader.split(' ')[1]);
        }
        
        if (req.cookies) {
            // Prioritize by role if possible
            if (allowedRoles.includes('admin') || allowedRoles.includes('super_admin')) {
                if (req.cookies.admin_token) tokens.push(req.cookies.admin_token);
            }
            if (allowedRoles.includes('seller')) {
                if (req.cookies.seller_token) tokens.push(req.cookies.seller_token);
            }
            if (allowedRoles.includes('customer')) {
                if (req.cookies.customer_token) tokens.push(req.cookies.customer_token);
            }
            
            // Add generic token as fallback
            if (req.cookies.token) tokens.push(req.cookies.token);
            
            // Add others as final fallback
            if (req.cookies.admin_token && !tokens.includes(req.cookies.admin_token)) tokens.push(req.cookies.admin_token);
            if (req.cookies.seller_token && !tokens.includes(req.cookies.seller_token)) tokens.push(req.cookies.seller_token);
            if (req.cookies.customer_token && !tokens.includes(req.cookies.customer_token)) tokens.push(req.cookies.customer_token);
        }

        // Filter out duplicates and nulls
        const uniqueTokens = [...new Set(tokens)].filter(Boolean);



        if (uniqueTokens.length === 0) {

            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const tokenHashes = uniqueTokens.map(t => crypto.createHash('sha256').update(t).digest('hex'));

        // 2. Query all tokens at once
        const result = await pool.query(`
            SELECT s.*, 
                   CASE 
                     WHEN s.user_type = 'customer' THEN (SELECT full_name FROM customers WHERE customer_id = s.user_ref_id)
                     WHEN s.user_type = 'seller' THEN (SELECT full_name FROM sellers WHERE seller_id = s.user_ref_id)
                     WHEN s.user_type IN ('admin', 'super_admin') THEN (SELECT name FROM admins WHERE admin_id = s.user_ref_id UNION SELECT name FROM super_admins WHERE super_admin_id = s.user_ref_id)
                   END as name,
                   CASE 
                     WHEN s.user_type = 'customer' THEN (SELECT email FROM customers WHERE customer_id = s.user_ref_id)
                     WHEN s.user_type = 'seller' THEN (SELECT email FROM sellers WHERE seller_id = s.user_ref_id)
                     WHEN s.user_type IN ('admin', 'super_admin') THEN (SELECT email FROM admins WHERE admin_id = s.user_ref_id UNION SELECT email FROM super_admins WHERE super_admin_id = s.user_ref_id)
                   END as email
            FROM auth_sessions s 
            WHERE s.token_hash = ANY($1) 
            AND s.is_blacklisted = false 
            AND s.expires_at > NOW()
        `, [tokenHashes]);

        if (result.rows.length === 0) {

            return res.status(401).json({ success: false, message: 'Invalid or expired session' });
        }

        // 3. Find the best matching session based on allowedRoles
        let session = null;
        if (allowedRoles.length > 0) {
            session = result.rows.find(r => allowedRoles.includes(r.user_type));
        }
        
        // If no direct role match, pick the first valid one (it might fail role check later but we have a user)
        if (!session) {
            session = result.rows[0];
        }

        const user = {
            id: session.user_ref_id,
            type: session.user_type,
            email: session.email,
            name: session.name
        };



        // 4. Role Check
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.type)) {

            return res.status(403).json({ 
                success: false, 
                message: 'Insufficient permissions',
                debug: { userType: user.type, allowedRoles }
            });
        }

        req.user = user;
        req.sessionId = session.session_id;
        next();
    } catch (error) {
        console.error("AUTH MIDDLEWARE ERROR:", error);

        return res.status(500).json({ success: false, message: 'Authentication error' });
    }
};

/**
 * Legacy wrapper for backward compatibility
 */
export const verifyToken = requireAuth([]); 

/**
 * Optional Auth (sets req.user if token present, but doesn't block)
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const tokens = [];
        if (req.headers.authorization?.startsWith('Bearer ')) {
            tokens.push(req.headers.authorization.split(' ')[1]);
        }
        if (req.cookies) {
            if (req.cookies.token) tokens.push(req.cookies.token);
            if (req.cookies.admin_token) tokens.push(req.cookies.admin_token);
            if (req.cookies.seller_token) tokens.push(req.cookies.seller_token);
            if (req.cookies.customer_token) tokens.push(req.cookies.customer_token);
        }

        const uniqueTokens = [...new Set(tokens)].filter(Boolean);
        if (uniqueTokens.length === 0) return next();

        const tokenHashes = uniqueTokens.map(t => crypto.createHash('sha256').update(t).digest('hex'));
        const result = await pool.query(`
            SELECT user_ref_id, user_type 
            FROM auth_sessions 
            WHERE token_hash = ANY($1) AND is_blacklisted = false AND expires_at > NOW()
            LIMIT 1
        `, [tokenHashes]);

        if (result.rows.length > 0) {
            req.user = {
                id: result.rows[0].user_ref_id,
                type: result.rows[0].user_type
            };
        }
        next();
    } catch (error) {
        next();
    }
};