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
            // Collect all known role-specific tokens
            if (req.cookies.admin_token) tokens.push(req.cookies.admin_token);
            if (req.cookies.seller_token) tokens.push(req.cookies.seller_token);
            if (req.cookies.customer_token) tokens.push(req.cookies.customer_token);
            if (req.cookies.token) tokens.push(req.cookies.token);
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

        // 3.5 Check for idle session timeout (2 hours)
        const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
        const lastAccessed = new Date(session.last_accessed_at || session.created_at).getTime();
        if (Date.now() - lastAccessed > IDLE_TIMEOUT_MS) {
            // Blacklist the session
            await pool.query(
                "UPDATE auth_sessions SET is_blacklisted = true WHERE session_id = $1",
                [session.session_id]
            );
            
            // Clear all potential role cookies to prevent mutually exclusive session pollution
            const clearOptions = { 
                path: '/', 
                httpOnly: true, 
                sameSite: 'lax', 
                secure: process.env.NODE_ENV === 'production' 
            };
            res.clearCookie('token', clearOptions);
            res.clearCookie('customer_token', clearOptions);
            res.clearCookie('seller_token', clearOptions);
            res.clearCookie('admin_token', clearOptions);
            res.clearCookie('super_admin_token', clearOptions);

            return res.status(401).json({ success: false, message: 'Session expired due to inactivity' });
        }

        // Update last_accessed_at to NOW()
        await pool.query(
            "UPDATE auth_sessions SET last_accessed_at = NOW() WHERE session_id = $1",
            [session.session_id]
        );

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
                message: 'Insufficient permissions'
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
 * Optional Auth (sets req.user and req.sessionId if token present, but doesn't block)
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
            SELECT session_id, user_ref_id, user_type, last_accessed_at, created_at 
            FROM auth_sessions 
            WHERE token_hash = ANY($1) AND is_blacklisted = false AND expires_at > NOW()
            LIMIT 1
        `, [tokenHashes]);

        if (result.rows.length > 0) {
            const session = result.rows[0];
            const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
            const lastAccessed = new Date(session.last_accessed_at || session.created_at).getTime();
            
            if (Date.now() - lastAccessed <= IDLE_TIMEOUT_MS) {
                req.sessionId = session.session_id;
                req.user = {
                    id: session.user_ref_id,
                    type: session.user_type
                };
                
                // Update last accessed in background
                pool.query(
                    "UPDATE auth_sessions SET last_accessed_at = NOW() WHERE session_id = $1",
                    [session.session_id]
                ).catch(() => {});
            }
        }
        next();
    } catch (error) {
        next();
    }
};