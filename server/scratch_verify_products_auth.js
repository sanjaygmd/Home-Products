import { pool } from './configs/db.js';
import crypto from 'crypto';

async function testAdminProductsAuth() {
    try {
        // Find a super admin session
        const sessionRes = await pool.query("SELECT * FROM auth_sessions WHERE user_type = 'super_admin' LIMIT 1");
        if (sessionRes.rows.length === 0) {
            console.log("No super admin session found to test with.");
            process.exit(0);
        }
        
        const session = sessionRes.rows[0];
        console.log("Testing with Super Admin Session:", session.session_id);
        
        // Re-run the identification logic from authMiddleware
        const result = await pool.query(`
            SELECT s.*, a.name as admin_name, a.email as admin_email,
                   sel.store_name, sel.email as seller_email,
                   sa.name as super_admin_name, sa.email as super_admin_email
            FROM auth_sessions s
            LEFT JOIN admins a ON s.user_ref_id = a.admin_id AND s.user_type = 'admin'
            LEFT JOIN sellers sel ON s.user_ref_id = sel.seller_id AND s.user_type = 'seller'
            LEFT JOIN super_admins sa ON s.user_ref_id = sa.super_admin_id AND s.user_type = 'super_admin'
            WHERE s.session_id = $1
        `, [session.session_id]);
        
        const user = result.rows[0];
        console.log("Identified User:", {
            id: user.user_ref_id,
            type: user.user_type,
            email: user.admin_email || user.seller_email || user.super_admin_email,
            name: user.admin_name || user.store_name || user.super_admin_name
        });
        
        const allowedRoles = ['admin', 'super_admin'];
        const isAuthorized = allowedRoles.includes(user.user_type);
        console.log("Is Authorized:", isAuthorized);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testAdminProductsAuth();
