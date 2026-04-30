import { pool } from "../../configs/db.js";
import fs from 'fs';
import path from 'path';



import { createAuthSession, invalidateSession, cookieConfig, getCookieName, setSessionCookie } from "../../utils/authSession.js";
import { logAudit } from "../../utils/auditLogger.js";
import { processAutoPayout } from "../PayoutController.js";
import { pushOrderToShiprocket, createShiprocketReturn } from "../ShipmentController.js";
import { sendOrderStatusNotifications } from "../../utils/notifications.js";
import { sendAdminPasswordResetEmail, sendSuperAdminLoginOTP } from "../../utils/mailer.js";
import { isPasswordStrong } from "../../utils/validation.js";

const superAdminLoginOtps = new Map();
const resetOtps = new Map();


export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, masterKey, type = 'admin' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Required fields are missing" });
    }

    if (!isPasswordStrong(password)) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." 
      });
    }


    const table = type === 'super_admin' ? 'super_admins' : 'admins';
    const idCol = type === 'super_admin' ? 'super_admin_id' : 'admin_id';

    const countRes = await pool.query(`SELECT COUNT(*) FROM ${table}`);
    const hasUsers = parseInt(countRes.rows[0].count) > 0;

    const keyRes = await pool.query("SELECT master_key FROM super_admins LIMIT 1");
    const EXPECTED_MASTER_KEY = keyRes.rows[0]?.master_key || process.env.MASTER_SECURITY_KEY;

    if (hasUsers) {
      if (!masterKey || masterKey !== EXPECTED_MASTER_KEY) {
        return res.status(403).json({
          success: false,
          message: `Administrative registration for ${type} is restricted. Please provide a valid Master Security Key.`
        });
      }
    }

    const existing = await pool.query(`SELECT ${idCol} FROM ${table} WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: `Email already registered as ${type}` });
    }

    const result = await pool.query(
      `INSERT INTO ${table} 
       (${idCol}, name, email, password_hash, role, is_active, created_at, updated_at${type === 'super_admin' ? ', master_key' : ''}) 
       VALUES 
       (gen_random_uuid(), $1, $2, crypt($3, gen_salt('bf')), $4, true, NOW(), NOW()${type === 'super_admin' ? ', $5' : ''})
       RETURNING ${idCol} as id, name, email, role`,
      type === 'super_admin' ? [name, email, password, type, EXPECTED_MASTER_KEY] : [name, email, password, type]
    );

    const user = result.rows[0];

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const device = { agent: req.get('User-Agent') };
    const session = await createAuthSession(user.id, type, ip, device);

    await logAudit({
      admin_id: user.id,
      action: 'ADMIN_REGISTER',
      table_name: table,
      record_id: user.id,
      req,
      is_super_admin: type === 'super_admin'
    });

    setSessionCookie(res, typeof type !== 'undefined' ? type : 'admin', session.token);

    return res.status(201).json({
      success: true,
      message: `${type} account initialized successfully`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sessionId: session.sessionId
      }
    });


  } catch (error) {
    console.error("ADMIN REGISTER ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to initialize admin account" });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { email, password, type = 'admin' } = req.body;


    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const table = type === 'super_admin' ? 'super_admins' : 'admins';
    const idCol = type === 'super_admin' ? 'super_admin_id' : 'admin_id';

    const result = await pool.query(`SELECT * FROM ${table} WHERE email = $1`, [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `${type} account not found` });
    }

    const user = result.rows[0];
    const userId = user[idCol];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: "Account is deactivated. Contact platform owner." });
    }

    const passwordMatch = await pool.query("SELECT crypt($1, $2) = $2 AS match", [password, user.password_hash]);
    if (!passwordMatch.rows[0].match) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (type === 'super_admin') {
      // 2FA required for Super Admin
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      superAdminLoginOtps.set(user.email, {
        otp,
        expires: Date.now() + 5 * 60 * 1000,
        user: { ...user, userId }
      });

      await sendSuperAdminLoginOTP(user.email, user.name, otp);

      return res.status(200).json({
        success: true,
        requires2FA: true,
        email: user.email,
        message: "2FA Verification Code sent to email"
      });
    }

    await pool.query(`UPDATE ${table} SET last_login_at = NOW() WHERE ${idCol} = $1`, [userId]);

    const ip = req.ip || req.connection.remoteAddress;
    const device = { agent: req.get('User-Agent') };
    const session = await createAuthSession(userId, type, ip, device);

    // Log the successful login
    await logAudit({
      admin_id: userId,
      action: 'LOGIN',
      table_name: table,
      record_id: userId,
      req,
      is_super_admin: type === 'super_admin'
    });

    setSessionCookie(res, typeof type !== 'undefined' ? type : 'admin', session.token);



    return res.status(200).json({
      success: true,
      message: `${type} login successful`,
      data: {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        sessionId: session.sessionId
      }
    });


  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Internal server error during login" });
  }
};

/**
 * Verify Super Admin 2FA Login
 */
export const verifySuperAdminLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const loginData = superAdminLoginOtps.get(email);

    if (!loginData) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
    }

    if (Date.now() > loginData.expires) {
      superAdminLoginOtps.delete(email);
      return res.status(400).json({ success: false, message: "Verification code has expired" });
    }

    if (loginData.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }

    const user = loginData.user;
    const userId = user.userId;

    await pool.query(`UPDATE super_admins SET last_login_at = NOW() WHERE super_admin_id = $1`, [userId]);


    const ip = req.ip || req.connection.remoteAddress;
    const device = { agent: req.get('User-Agent') };
    const session = await createAuthSession(userId, 'super_admin', ip, device);

    await logAudit({
      admin_id: userId,
      action: 'LOGIN',
      table_name: 'super_admins',
      record_id: userId,
      req,
      is_super_admin: true
    });

    superAdminLoginOtps.delete(email);

    setSessionCookie(res, typeof type !== 'undefined' ? type : 'admin', session.token);

    return res.status(200).json({
      success: true,
      message: "Super Admin login successful",
      data: {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        sessionId: session.sessionId
      }
    });


  } catch (error) {
    console.error("VERIFY SUPER ADMIN LOGIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const logoutAdmin = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) {
      await invalidateSession(sessionId);
    }
    res.clearCookie('token', { path: '/' });
    res.clearCookie('admin_token', { path: '/' });
    res.clearCookie('seller_token', { path: '/' });
    res.clearCookie('customer_token', { path: '/' });
    return res.status(200).json({ success: true, message: "Admin logged out" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Logout failed" });
  }
};


/**
 * Request Password Reset (Admin)
 * This creates a notification for Super Admins
 */
export const requestAdminPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    let accountInfo = null;
    let table = 'admins';
    let idCol = 'admin_id';

    const adminCheck = await pool.query("SELECT admin_id, name FROM admins WHERE email = $1", [email]);
    if (adminCheck.rows.length > 0) {
      accountInfo = adminCheck.rows[0];
    } else {
      const saCheck = await pool.query("SELECT super_admin_id, name FROM super_admins WHERE email = $1", [email]);
      if (saCheck.rows.length > 0) {
        accountInfo = saCheck.rows[0];
        table = 'super_admins';
        idCol = 'super_admin_id';
      }
    }

    if (!accountInfo) {
      return res.status(404).json({ success: false, message: "This email is not registered as an Administrator or Super Admin." });
    }

    // Generate a 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in memory with 15 minute expiration
    resetOtps.set(email, {
      otp,
      expires: Date.now() + 15 * 60 * 1000,
      table,
      idCol,
      id: accountInfo[idCol]
    });

    // Send email with OTP
    await sendAdminPasswordResetEmail(email, accountInfo.name, otp);

    res.json({ success: true, message: "A verification code has been sent to your registered email." });
  } catch (error) {
    console.error("PWD RESET REQUEST ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Verify OTP and Set New Password
 */
export const verifyAdminPasswordReset = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and new password are required" });
    }

    if (!isPasswordStrong(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." 
      });
    }


    const resetData = resetOtps.get(email);

    if (!resetData) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
    }

    if (Date.now() > resetData.expires) {
      resetOtps.delete(email);
      return res.status(400).json({ success: false, message: "Verification code has expired" });
    }

    if (resetData.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }

    // Update the password
    await pool.query(
      `UPDATE ${resetData.table} SET password_hash = crypt($1, gen_salt('bf')), updated_at = NOW() WHERE ${resetData.idCol} = $2`,
      [newPassword, resetData.id]
    );

    // Clear the OTP
    resetOtps.delete(email);

    res.json({ success: true, message: "Password has been successfully reset" });
  } catch (error) {
    console.error("VERIFY PWD RESET ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


/**
 * Get Admin Dashboard Stats and Charts
 */
export const getAdminDashboardData = async (req, res) => {
  try {
    // 1. Core Stats
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE is_deleted = false) as total_orders,
        (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) as total_products,
        (SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL) as total_customers,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE (payment_status = 'Paid' OR order_status = 'Delivered') AND order_status != 'Cancelled' AND is_deleted = false) as total_revenue,
        (SELECT COUNT(*) FROM orders WHERE placed_at >= CURRENT_DATE AND is_deleted = false) as today_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE placed_at >= CURRENT_DATE AND (payment_status = 'Paid' OR order_status = 'Delivered') AND order_status != 'Cancelled' AND is_deleted = false) as today_revenue,
        (SELECT COUNT(*) FROM products WHERE created_at >= CURRENT_DATE AND deleted_at IS NULL) as today_new_products,
        (SELECT COUNT(*) FROM customers WHERE created_at >= CURRENT_DATE AND deleted_at IS NULL) as today_new_customers
    `;
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];


    // 2. Revenue Trend (Last 6 Months)
    const trendQuery = `
      SELECT 
        TO_CHAR(m.month, 'Mon') as month,
        COALESCE(SUM(o.total_amount), 0) as revenue,
        COALESCE((SELECT SUM(commission_amount) FROM seller_commissions sc JOIN orders o2 ON sc.order_id = o2.order_id WHERE date_trunc('month', o2.placed_at) = m.month AND (o2.payment_status = 'Paid' OR o2.order_status = 'Delivered') AND o2.order_status != 'Cancelled'), 0) as profit,
        COUNT(o.order_id) as orders
      FROM (
        SELECT date_trunc('month', CURRENT_DATE) - (i || ' month')::interval as month
        FROM generate_series(0, 5) i
      ) m
      LEFT JOIN orders o ON date_trunc('month', o.placed_at) = m.month AND (o.payment_status = 'Paid' OR o.order_status = 'Delivered') AND o.order_status != 'Cancelled' AND o.is_deleted = false
      GROUP BY m.month
      ORDER BY m.month ASC
    `;
    const trendResult = await pool.query(trendQuery);

    // 3. Category (Room) Distribution
    const categoryQuery = `
      SELECT COALESCE(room, 'Other') as name, COUNT(*) as value
      FROM products
      WHERE deleted_at IS NULL
      GROUP BY room
      ORDER BY value DESC
      LIMIT 5
    `;
    const categoryResult = await pool.query(categoryQuery);

    // 4. Recent Orders
    const ordersQuery = `
      SELECT o.order_id as id, c.full_name as customer, o.total_amount as total, o.order_status as status, 
             TO_CHAR(o.placed_at, 'DD Mon, HH:MI AM') as time,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) as items
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE o.is_deleted = false
      ORDER BY o.placed_at DESC
      LIMIT 5
    `;
    const ordersResult = await pool.query(ordersQuery);

    // 5. Recent Activity (Audit Logs)
    const activityQuery = `
      SELECT 
        CASE 
          WHEN action = 'LOGIN' THEN 'Admin logged in'
          WHEN action = 'CREATE' THEN 'New ' || table_name || ' record created'
          WHEN action = 'UPDATE' THEN table_name || ' record updated'
          WHEN action = 'DELETE' THEN table_name || ' record removed'
          ELSE action || ' on ' || table_name
        END as text,
        TO_CHAR(created_at, 'HH:MI AM') as time,
        action as type
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const activityResult = await pool.query(activityQuery);

    // 6. Product Performance
    const performanceQuery = `
      SELECT name, price, stock_quantity as stock, rating, reviews_count as "reviewCount", product_id as id, sku, room, images[1] as image
      FROM products
      WHERE deleted_at IS NULL
      ORDER BY rating DESC, reviews_count DESC NULLS LAST
      LIMIT 5
    `;
    const performanceResult = await pool.query(performanceQuery);

    const dashboardData = {
      stats: {
        total_orders: Number(stats.total_orders),
        total_products: Number(stats.total_products),
        total_customers: Number(stats.total_customers),
        total_revenue: Number(stats.total_revenue),
        today_orders: Number(stats.today_orders),
        today_revenue: Number(stats.today_revenue),
        today_new_products: Number(stats.today_new_products),
        today_new_customers: Number(stats.today_new_customers)
      },
      revenueTrend: trendResult.rows.map(r => ({
        ...r,
        revenue: Number(r.revenue),
        profit: Number(r.profit),
        orders: Number(r.orders)
      })),
      categoryDistribution: categoryResult.rows.map(r => ({
        ...r,
        value: Number(r.value)
      })),
      recentOrders: ordersResult.rows.map(o => ({
        ...o,
        total: `₹${Number(o.total || 0).toLocaleString('en-IN')}`,
        time: o.time
      })),
      recentActivity: activityResult.rows,
      productPerformance: performanceResult.rows.map((p, i) => ({
        rank: i + 1,
        ...p,
        performance: Math.round((Number(p.rating) || 4.5) * 20)
      }))
    };


    return res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error("ADMIN DASHBOARD DATA ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
  }
};

/**
 * Get All Audit Logs (Admin View)
 */
export const getAuditLogs = async (req, res) => {
  try {
    const logsQuery = `
      SELECT 
        al.*,
        COALESCE(a.name, s.store_name, 'System') as actor_name,
        COALESCE(a.email, s.email, 'system@homeproducts.com') as actor_email
      FROM audit_logs al
      LEFT JOIN admins a ON al.admin_id = a.admin_id
      LEFT JOIN sellers s ON al.admin_id = s.seller_id
      ORDER BY al.created_at DESC
      LIMIT 100
    `;
    const result = await pool.query(logsQuery);

    return res.status(200).json({
      success: true,
      data: result.rows.map(log => ({
        ...log,
        created_at: new Date(log.created_at).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }))
    });
  } catch (error) {
    console.error("GET AUDIT LOGS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
};

/**
 * Get Detailed Sellers List and Performance
 */
export const getSellersData = async (req, res) => {
  try {
    const sellersQuery = `
      SELECT 
        s.seller_id as id,
        s.store_name as name,
        s.full_name as owner,
        s.email,
        s.phone,
        s.is_verified,
        s.is_active,
        s.block_reason,
        s.created_at as "joinDate",
        (SELECT COUNT(*) FROM products WHERE seller_id = s.seller_id AND deleted_at IS NULL) as products,
        (SELECT COUNT(*) FROM order_sellers WHERE seller_id = s.seller_id) as orders,
        (SELECT COALESCE(SUM(os.seller_subtotal), 0) 
         FROM order_sellers os
         JOIN orders o ON o.order_id = os.order_id
         WHERE os.seller_id = s.seller_id 
           AND (o.payment_status = 'Paid' OR o.order_status = 'Delivered') 
           AND o.order_status != 'Cancelled' 
           AND o.is_deleted = false) as revenue,
        COALESCE((SELECT AVG(rating) FROM products WHERE seller_id = s.seller_id), 0) as rating
      FROM sellers s
      ORDER BY s.created_at DESC
    `;
    const result = await pool.query(sellersQuery);

    return res.status(200).json({
      success: true,
      data: result.rows.map(s => ({
        ...s,
        status: s.is_active ? (s.is_verified ? 'Active' : 'Pending KYC') : 'Suspended',
        revenue: `₹${Number(s.revenue).toLocaleString('en-IN')}`,
        rating: Number(Number(s.rating).toFixed(1)),
        joinDate: new Date(s.joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        block_reason: s.block_reason
      }))
    });
  } catch (error) {
    console.error("GET SELLERS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch sellers data" });
  }
};

/**
 * Get Financial Analytics and Transactions
 */
export const getFinanceData = async (req, res) => {
  try {
    const { range = 'monthly' } = req.query;

    let rangeFilter = "";
    if (range === 'monthly') {
      rangeFilter = "AND created_at >= CURRENT_DATE - interval '1 month'";
    } else if (range === 'annual') {
      rangeFilter = "AND created_at >= CURRENT_DATE - interval '1 year'";
    }

    // 1. Revenue & Profit Summary (Contextual to range)
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'order_payment' THEN amount ELSE 0 END), 0) as gross_revenue,
        COALESCE(SUM(CASE WHEN transaction_type = 'order_payment' THEN amount * 0.10 ELSE 0 END), 0) as platform_commission
      FROM finance_transactions
      WHERE 1=1 ${rangeFilter}
    `;
    const summaryResult = await pool.query(summaryQuery);
    const gross = parseFloat(summaryResult.rows[0].gross_revenue);
    const comm = parseFloat(summaryResult.rows[0].platform_commission);

    // 2. Trend Data (Monthly or Annual)
    let trendQuery = '';
    if (range === 'annual') {
      trendQuery = `
        SELECT 
          y.year::text as name,
          COALESCE(SUM(CASE WHEN ft.transaction_type = 'order_payment' THEN ft.amount ELSE 0 END), 0) as revenue,
          COALESCE(SUM(CASE WHEN ft.transaction_type = 'payout' THEN ft.amount ELSE 0 END), 0) as costs,
          COALESCE(SUM(CASE WHEN ft.transaction_type = 'order_payment' THEN ft.amount * 0.10 ELSE 0 END), 0) as profit
        FROM (
          SELECT EXTRACT(YEAR FROM CURRENT_DATE) - i as year
          FROM generate_series(0, 4) i
        ) y
        LEFT JOIN finance_transactions ft ON EXTRACT(YEAR FROM ft.created_at) = y.year
        GROUP BY y.year
        ORDER BY y.year ASC
      `;
    } else {
      trendQuery = `
        SELECT 
          TO_CHAR(m.month, 'Mon') as name,
          COALESCE(SUM(CASE WHEN ft.transaction_type = 'order_payment' THEN ft.amount ELSE 0 END), 0) as revenue,
          COALESCE(SUM(CASE WHEN ft.transaction_type = 'payout' THEN ft.amount ELSE 0 END), 0) as costs,
          COALESCE(SUM(CASE WHEN ft.transaction_type = 'order_payment' THEN ft.amount * 0.10 ELSE 0 END), 0) as profit
        FROM (
          SELECT date_trunc('month', CURRENT_DATE) - (i || ' month')::interval as month
          FROM generate_series(0, 5) i
        ) m
        LEFT JOIN finance_transactions ft ON date_trunc('month', ft.created_at) = m.month
        GROUP BY m.month
        ORDER BY m.month ASC
      `;
    }
    const trendResult = await pool.query(trendQuery);

    // 3. Payouts Ledger
    const payoutsQuery = `
      SELECT 
        p.payout_id as id,
        s.store_name as name,
        p.amount,
        p.status,
        p.created_at as date,
        COALESCE((SELECT SUM(sale_amount) FROM seller_commissions WHERE payout_id = p.payout_id), 0) as revenue
      FROM seller_payouts p
      JOIN sellers s ON p.seller_id = s.seller_id
      ORDER BY p.created_at DESC
      LIMIT 20
    `;
    const payoutsResult = await pool.query(payoutsQuery);

    // 4. Expense Distribution
    const expenseQuery = `
      SELECT 'Seller Payouts' as name, COALESCE(SUM(amount), 0) as value FROM finance_transactions WHERE transaction_type = 'payout'
      UNION ALL
      SELECT 'Platform Tax' as name, COALESCE(SUM(amount) * 0.10 * 0.18, 0) as value FROM finance_transactions WHERE transaction_type = 'order_payment'
      UNION ALL
      SELECT 'Shipping' as name, COUNT(*) * 50 as value FROM orders WHERE order_status = 'Shipped' OR order_status = 'Delivered'
      UNION ALL
      SELECT 'Infrastructure' as name, 5000 as value
    `;
    const expenseResult = await pool.query(expenseQuery);

    // 5. Recent Transactions (Real Ledger)
    const txnsQuery = `
      SELECT 
        ft.finance_transactions_id as id,
        ft.transaction_type as type,
        CASE 
          WHEN ft.transaction_type = 'payout' THEN s.store_name 
          ELSE 'Order Sale' 
        END as seller,
        ft.amount,
        TO_CHAR(ft.created_at, 'DD Mon YYYY') as date,
        'Completed' as status
      FROM finance_transactions ft
      LEFT JOIN seller_payouts sp ON ft.seller_payout_id = sp.payout_id
      LEFT JOIN sellers s ON sp.seller_id = s.seller_id
      ORDER BY ft.created_at DESC
      LIMIT 15
    `;
    const txnsResult = await pool.query(txnsQuery);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          gross_revenue: gross,
          platform_commission: comm,
          net_profit: comm // In this simplified model, net profit = platform commission
        },
        monthlyPL: trendResult.rows.map(r => ({
          ...r,
          revenue: Number(r.revenue),
          costs: Number(r.costs),
          profit: Number(r.profit)
        })),
        payouts: payoutsResult.rows.map((p) => ({
          ...p,
          amount: Number(p.amount),
          revenue: Number(p.revenue)
        })),
        expenses: expenseResult.rows.map(r => ({
          name: r.name,
          value: Number(r.value)
        })),
        transactions: txnsResult.rows.map(r => ({
          ...r,
          amount: Number(r.amount)
        }))
      }
    });
  } catch (error) {
    console.error("GET FINANCE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch financial data" });
  }
};

/**
 * Get Comprehensive Analytics (Sales, Reports, Payments)
 */
export const getAnalyticsData = async (req, res) => {
  try {
    const { range = 'daily' } = req.query;

    let rangeFilter = '';
    const r = range.toLowerCase();
    if (r === 'daily') rangeFilter = "AND o.placed_at >= CURRENT_DATE - interval '2 days'"; // Include Yesterday/Today
    else if (r === 'weekly') rangeFilter = "AND o.placed_at >= CURRENT_DATE - interval '1 week'";
    else if (r === 'monthly') rangeFilter = "AND o.placed_at >= CURRENT_DATE - interval '1 month'";
    else if (r === 'quarterly') rangeFilter = "AND o.placed_at >= CURRENT_DATE - interval '3 month'";
    else if (r === 'half_yearly' || r === 'halfyearly' || r === 'half-yearly') rangeFilter = "AND o.placed_at >= CURRENT_DATE - interval '6 month'";
    else if (r === 'annual' || r === 'yearly') rangeFilter = "AND o.placed_at >= CURRENT_DATE - interval '1 year'";

    // 1. Sales by Category
    const categoryResult = await pool.query(`
      SELECT p.room as category, SUM(oi.quantity * oi.unit_price) as revenue, COUNT(oi.order_item_id) as sales
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE (o.payment_status = 'Paid' OR o.order_status = 'Delivered') AND o.order_status != 'Cancelled' AND o.is_deleted = false ${rangeFilter}
      GROUP BY p.room ORDER BY revenue DESC
    `);

    // 2. Top Performing Products
    const productsResult = await pool.query(`
      SELECT p.name, s.store_name as seller, SUM(oi.quantity) as qty, SUM(oi.quantity * oi.unit_price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      JOIN sellers s ON p.seller_id = s.seller_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE (o.payment_status = 'Paid' OR o.order_status = 'Delivered') AND o.order_status != 'Cancelled' AND o.is_deleted = false ${rangeFilter}
      GROUP BY p.name, s.store_name ORDER BY revenue DESC LIMIT 10
    `);

    // 3. Summary Stats (Recalculated for accuracy)
    const summaryResult = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN (o.payment_status = 'Paid' OR o.order_status = 'Delivered') AND o.order_status != 'Cancelled' THEN o.total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN o.order_status = 'Delivered' THEN oi_count.item_count ELSE 0 END), 0) as total_items_sold
      FROM orders o
      LEFT JOIN (
        SELECT order_id, SUM(quantity) as item_count FROM order_items GROUP BY order_id
      ) oi_count ON o.order_id = oi_count.order_id
      WHERE o.is_deleted = false ${rangeFilter}
    `);

    // 4. Payment Status Breakdown
    const paymentStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE (payment_status = 'Paid' OR order_status = 'Delivered') AND order_status != 'Cancelled') as success,
        COUNT(*) FILTER (WHERE order_status = 'Cancelled') as cancelled,
        COUNT(*) FILTER (WHERE order_status != 'Cancelled' AND payment_status != 'Paid' AND order_status != 'Delivered') as pending
      FROM orders WHERE is_deleted = false
    `);

    // 6. Trend Configuration
    let trendStep = 'day';
    let trendCount = 14;
    let trendFmt = 'DD Mon';
    let trendOffset = 0;

    if (r === 'daily') { trendStep = 'day'; trendCount = 13; trendFmt = 'DD Mon'; trendOffset = -1; }
    else if (r === 'weekly') { trendStep = 'week'; trendCount = 11; trendFmt = 'W-WW'; trendOffset = -1; }
    else if (r === 'monthly') { trendStep = 'month'; trendCount = 11; trendFmt = 'Mon YY'; }
    else if (r === 'quarterly') { trendStep = 'month'; trendCount = 11; trendFmt = 'Mon YY'; }
    else if (r === 'halfyearly' || r === 'half_yearly' || r === 'half-yearly') { trendStep = 'month'; trendCount = 11; trendFmt = 'Mon YY'; }
    else if (r === 'annual' || r === 'yearly') { trendStep = 'year'; trendCount = 4; trendFmt = 'YYYY'; }
    else if (r === 'all') { trendStep = 'month'; trendCount = 59; trendFmt = 'Mon YY'; }

    // 7. Dynamic Trend (Optimized Profit Calc)
    const trendResult = await pool.query(`
      SELECT 
        TO_CHAR(t.date, '${trendFmt}') as name,
        COALESCE(SUM(o.total_amount), 0) as revenue,
        COALESCE(SUM(os.seller_subtotal), 0) as costs,
        COUNT(o.order_id) as orders,
        COALESCE(SUM(sc.commission_amount), 0) as profit
      FROM (
        SELECT date_trunc('${trendStep}', NOW()) - (i || ' ${trendStep}')::interval as date
        FROM generate_series(${trendOffset}, ${trendCount} + ${trendOffset}) i
      ) t
      LEFT JOIN orders o ON date_trunc('${trendStep}', o.placed_at) = t.date 
        AND (o.payment_status = 'Paid' OR o.order_status = 'Delivered') 
        AND o.order_status != 'Cancelled' 
        AND o.is_deleted = false
      LEFT JOIN order_sellers os ON o.order_id = os.order_id
      LEFT JOIN seller_commissions sc ON o.order_id = sc.order_id
      GROUP BY t.date
      ORDER BY t.date ASC
    `);

    // 7. Recent Returns
    const returnsResult = await pool.query(`
      SELECT o.order_id as orderId, c.full_name as customer, o.total_amount as amount, o.order_status as status, o.placed_at as date
      FROM orders o JOIN customers c ON o.customer_id = c.customer_id
      WHERE o.order_status = 'Cancelled' AND o.is_deleted = false LIMIT 10
    `);

    // 8. Category Distribution (Product Count)
    const categoryDistributionResult = await pool.query(`
      SELECT room as name, COUNT(*) as value
      FROM products WHERE deleted_at IS NULL
      GROUP BY room ORDER BY value DESC
    `);

    // 9. Order Status Distribution
    const statusDistributionResult = await pool.query(`
      SELECT order_status as name, COUNT(*) as value
      FROM orders WHERE is_deleted = false
      GROUP BY order_status
    `);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          total_orders: Number(summaryResult.rows[0].total_orders),
          total_revenue: Number(summaryResult.rows[0].total_revenue),
          total_items_sold: Number(summaryResult.rows[0].total_items_sold)
        },
        trend: trendResult.rows.map(r => ({
          ...r,
          revenue: Number(r.revenue),
          costs: Number(r.costs),
          profit: Number(r.profit),
          orders: Number(r.orders)
        })),
        categorySales: categoryResult.rows.map(r => ({
          ...r,
          revenue: Number(r.revenue),
          sales: Number(r.sales)
        })),
        categoryDistribution: categoryDistributionResult.rows.map(r => ({ ...r, value: Number(r.value) })),
        statusDistribution: statusDistributionResult.rows.map(r => ({ ...r, value: Number(r.value) })),
        recentDeliveries: (await pool.query(`
          SELECT d.*, o.total_amount, a.full_name as customer_name
          FROM deliveries d
          JOIN orders o ON d.order_id = o.order_id
          JOIN addresses a ON o.address_id = a.address_id
          ORDER BY d.updated_at DESC
          LIMIT 10
        `)).rows,
        topProducts: productsResult.rows.map(r => ({
          ...r,
          qty: Number(r.qty),
          revenue: Number(r.revenue)
        })),
        paymentStats: {
          total: Number(paymentStatsResult.rows[0].total),
          success: Number(paymentStatsResult.rows[0].success),
          cancelled: Number(paymentStatsResult.rows[0].cancelled),
          pending: Number(paymentStatsResult.rows[0].pending)
        },
        recentReturns: returnsResult.rows.map(r => ({
          id: `RET-${(r.orderId || '').split('-')[0] || 'N/A'}`,
          ...r,
          reason: "Not Specified",
          amount: `₹${Number(r.amount).toLocaleString('en-IN')}`,
          date: new Date(r.date).toLocaleDateString('en-IN')
        }))
      }
    });
  } catch (error) {
    console.error("GET ANALYTICS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch analytics data" });
  }
};

/**
 * Get All Payments (Admin View)
 */
export const getAllPayments = async (req, res) => {
  try {
    const paymentsQuery = `
      SELECT 
        o.order_id as id,
        c.full_name as customer,
        o.total_amount as amount,
        o.payment_method as method,
        o.order_status as status,
        o.payment_status,
        o.cod_fee,
        o.placed_at as date
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE o.is_deleted = false
      ORDER BY o.placed_at DESC
    `;
    const result = await pool.query(paymentsQuery);

    const statsQuery = `
      SELECT 
        COALESCE(SUM(total_amount) FILTER (
          WHERE order_status != 'Cancelled' AND (payment_status = 'Paid' OR order_status = 'Delivered')
        ), 0) as total,
        COUNT(CASE 
          WHEN order_status != 'Cancelled' AND (payment_status = 'Paid' OR order_status = 'Delivered') THEN 1 
          ELSE NULL 
        END) as success,
        COUNT(CASE WHEN order_status = 'Cancelled' THEN 1 END) as cancelled,
        COUNT(CASE 
          WHEN order_status != 'Cancelled' AND payment_status != 'Paid' AND order_status != 'Delivered' THEN 1 
          ELSE NULL 
        END) as pending
      FROM orders
      WHERE is_deleted = false
    `;
    const statsResult = await pool.query(statsQuery);

    return res.status(200).json({
      success: true,
      data: result.rows.map(r => {
        let paymentStatus = 'Pending';
        let methodLabel = r.method;
        // Identify payment type
        const isCOD = r.method === 'cod' || parseFloat(r.cod_fee || 0) > 0;

        if (isCOD) {
          methodLabel = 'PostPaid';
        } else if (r.method === 'Prepaid' || r.method === 'razorpay') {
          methodLabel = 'Online';
        }

        // Determine Payment Status
        if (r.status === 'Cancelled') {
          paymentStatus = 'Cancelled';
        } else if (r.payment_status === 'Paid' || r.status === 'Delivered') {
          paymentStatus = 'Success';
        } else {
          paymentStatus = 'Pending';
        }

        return {
          ...r,
          method: methodLabel,
          amount: `₹${Number(r.amount).toLocaleString('en-IN')}`,
          date: new Date(r.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          status: paymentStatus
        };
      }),
      stats: {
        total: `₹${Number(statsResult.rows[0].total).toLocaleString('en-IN')}`,
        success: statsResult.rows[0].success,
        cancelled: statsResult.rows[0].cancelled,
        pending: statsResult.rows[0].pending
      }
    });
  } catch (error) {
    console.error("GET PAYMENTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
};

/**
 * Get All Returns (Admin View) - Synced with return_requests table
 */
export const getAllReturns = async (req, res) => {
  try {
    const returnsQuery = `
      SELECT 
        rr.return_request_id as id,
        c.full_name as customer,
        rr.refund_amount as amount,
        rr.refund_status as status,
        rr.requested_at as date,
        rr.reason,
        rr.order_id,
        rr.return_type,
        p.name as product_name
      FROM return_requests rr
      JOIN customers c ON rr.customer_id = c.customer_id
      JOIN order_items oi ON rr.order_item_id = oi.order_item_id
      JOIN products p ON oi.product_id = p.product_id
      ORDER BY rr.requested_at DESC
    `;
    const result = await pool.query(returnsQuery);

    return res.status(200).json({
      success: true,
      data: result.rows.map(r => ({
        ...r,
        id: r.id, // Keep the UUID for internal use
        displayId: `RET-${r.id.split('-')[0].toUpperCase()}`,
        orderId: r.order_id,
        amount: `₹${Number(r.amount).toLocaleString('en-IN')}`,
        date: new Date(r.date).toLocaleDateString('en-IN'),
        status: r.status // Pending, Approved, Rejected, etc.
      }))
    });
  } catch (error) {
    console.error("GET RETURNS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch returns" });
  }
};

/**
 * Resolve Return Request (Approve/Reject)
 */
export const resolveReturnRequest = async (req, res) => {
  const { id } = req.params; // return_request_id
  const { status, resolution_note, admin_id } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch return request details
    const rrRes = await client.query(
      `SELECT rr.*, o.address_id, oi.seller_id, oi.product_id, oi.variant_id, oi.quantity, oi.unit_price,
              c.full_name as cust_name, c.email as cust_email, c.phone as cust_phone,
              a.address_line_1, a.city, a.state, a.pincode, p.name as product_name
       FROM return_requests rr
       JOIN orders o ON rr.order_id = o.order_id
       JOIN order_items oi ON rr.order_item_id = oi.order_item_id
       JOIN products p ON oi.product_id = p.product_id
       JOIN customers c ON rr.customer_id = c.customer_id
       JOIN addresses a ON o.address_id = a.address_id
       WHERE rr.return_request_id = $1`,
      [id]
    );

    if (rrRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: "Return request not found" });
    }

    const rr = rrRes.rows[0];

    // 2. Update status in return_requests
    await client.query(
      `UPDATE return_requests 
       SET refund_status = $1, resolution_note = $2, resolved_by_admin_id = $3, resolved_at = NOW()
       WHERE return_request_id = $4`,
      [status, resolution_note, admin_id, id]
    );

    if (status === 'Approved') {
      // 3. Initiate Shiprocket Reverse Pickup
      // Fetch seller pickup location (where item should be returned)
      const sellerPickup = await client.query(
        "SELECT * FROM seller_pickup_location WHERE seller_id = $1 AND is_default = true",
        [rr.seller_id]
      );

      if (sellerPickup.rows.length > 0) {
        const pickup = sellerPickup.rows[0];

        // Construct Shiprocket Payload for Return
        const srPayload = {
          order_id: `RET-${rr.return_request_id.slice(0, 8)}`,
          order_date: new Date().toISOString().split('T')[0],
          pickup_customer_name: rr.cust_name,
          pickup_last_name: "",
          pickup_address: rr.address_line_1,
          pickup_city: rr.city,
          pickup_state: rr.state,
          pickup_country: "India",
          pickup_pincode: rr.pincode,
          pickup_email: rr.cust_email,
          pickup_phone: rr.cust_phone,
          shipping_customer_name: pickup.contact_name,
          shipping_last_name: "",
          shipping_address: pickup.address_line_1,
          shipping_city: pickup.city,
          shipping_state: pickup.state,
          shipping_country: "India",
          shipping_pincode: pickup.pincode,
          shipping_email: pickup.email || "support@marketplace.com",
          shipping_phone: pickup.contact_phone,
          order_items: [
            {
              name: rr.product_name || "Return Item",
              sku: rr.product_id.slice(0, 8),
              units: rr.quantity,
              selling_price: rr.unit_price
            }
          ],
          payment_method: "Prepaid",
          sub_total: rr.refund_amount,
          length: 10,
          breadth: 10,
          height: 10,
          weight: 0.5
        };

        try {
          const srReturn = await createShiprocketReturn(srPayload);

          if (srReturn && (srReturn.status_code === 1 || srReturn.shipment_id)) {
            // Log reverse shipment
            await client.query(
              `INSERT INTO reverse_shipments (
                    reverse_id, return_request_id, order_item_id, seller_id, customer_id, 
                    pickup_address_id, dropoff_pickup_location_id,
                    shiprocket_reverse_order_id, reverse_awb_code, status, initiated_at
                ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'Initiated', NOW())`,
              [id, rr.order_item_id, rr.seller_id, rr.customer_id, rr.address_id, pickup.pickup_id, srReturn.order_id, srReturn.awb_code || null]
            );

            // Update order item status
            await client.query(
              "UPDATE order_items SET item_status = 'Return Initiated' WHERE order_item_id = $1",
              [rr.order_item_id]
            );
          } else {
            console.warn('Shiprocket Return Sync Warning:', srReturn);
          }
        } catch (srError) {
          console.error('Shiprocket Return Sync Exception:', srError.message);
        }
      }
    } else if (status === 'Rejected') {
      // Just update the status, which was already done at step 2.
    }

    // 4. Notify Customer
    await client.query(
      `INSERT INTO notifications (notification_id, customer_id, type, message, created_at)
       VALUES (gen_random_uuid(), $1, 'return_update', $2, NOW())`,
      [rr.customer_id, `Your return request for Order #${rr.order_id.slice(0, 8).toUpperCase()} has been ${status}.`]
    );

    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: `Return request ${status} successfully.` });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("RESOLVE RETURN ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to resolve return request" });
  } finally {
    client.release();
  }
};

/**
 * Get All Orders (Admin View)
 */
export const getAllOrders = async (req, res) => {
  try {
    const ordersQuery = `
      SELECT 
        o.order_id as id,
        c.full_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        o.total_amount,
        o.order_status as status,
        o.payment_method,
        o.placed_at as created_at,
        COALESCE(a.address_line_1 || ', ' || a.city || ', ' || a.state || ' - ' || a.pincode, 'No Address Provided') as shipping_address,
        o.courier,
        o.tracking_id,
        o.estimated_delivery,
        (
          SELECT json_agg(json_build_object(
            'product_id', oi.product_id,
            'name', p.name,
            'price', oi.unit_price,
            'quantity', oi.quantity,
            'image', p.images[1]
          ))
          FROM order_items oi
          JOIN products p ON oi.product_id = p.product_id
          WHERE oi.order_id = o.order_id
        ) as items
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN addresses a ON o.address_id = a.address_id
      WHERE o.is_deleted = false
      ORDER BY o.placed_at DESC
    `;
    const result = await pool.query(ordersQuery);

    return res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error("GET ALL ORDERS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

/**
 * Get All Customers (Admin View)
 */
export const getAllCustomers = async (req, res) => {
  try {
    const customersQuery = `
      SELECT 
        customer_id,
        full_name as name,
        email,
        phone,
        created_at,
        is_active,
        block_reason
      FROM customers
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    const result = await pool.query(customersQuery);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("GET ALL CUSTOMERS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch customers" });
  }
};

/**
 * Toggle Customer Active Status with Reason
 */
export const toggleCustomerStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active, block_reason } = req.body;
  try {
    const updateQuery = `
      UPDATE customers 
      SET is_active = $1, block_reason = $2, updated_at = NOW() 
      WHERE customer_id = $3 AND is_active != $1
      RETURNING is_active, block_reason`;
    const result = await pool.query(updateQuery, [is_active, is_active ? null : block_reason, id]);

    if (result.rowCount === 0) {
      // Check if it failed because it was already in that state
      const check = await pool.query("SELECT is_active FROM customers WHERE customer_id = $1", [id]);
      if (check.rowCount > 0) {
        return res.status(200).json({
          success: true,
          message: `Customer is already ${is_active ? 'active' : 'blocked'}`,
          is_active: check.rows[0].is_active
        });
      }
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Customer ${is_active ? 'unblocked' : 'blocked'} successfully`,
      is_active: result.rows[0].is_active,
      block_reason: result.rows[0].block_reason
    });
  } catch (error) {
    console.error("TOGGLE CUSTOMER STATUS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

/**
 * Toggle Seller Active Status with Reason
 */
export const toggleSellerStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active, block_reason } = req.body;
  try {
    const updateQuery = `
      UPDATE sellers 
      SET is_active = $1, block_reason = $2, updated_at = NOW() 
      WHERE seller_id = $3 AND is_active != $1
      RETURNING is_active, block_reason`;
    const result = await pool.query(updateQuery, [is_active, is_active ? null : block_reason, id]);

    if (result.rowCount === 0) {
      const check = await pool.query("SELECT is_active FROM sellers WHERE seller_id = $1", [id]);
      if (check.rowCount > 0) {
        return res.status(200).json({
          success: true,
          message: `Seller is already ${is_active ? 'active' : 'blocked'}`,
          is_active: check.rows[0].is_active
        });
      }
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Seller ${is_active ? 'unblocked' : 'blocked'} successfully`,
      is_active: result.rows[0].is_active,
      block_reason: result.rows[0].block_reason
    });
  } catch (error) {
    console.error("TOGGLE SELLER STATUS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

/**
 * Super Admin: Delete Seller Account
 * Performed within a transaction to ensure all dependencies are handled.
 */
export const deleteSeller = async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if seller exists
    const checkRes = await client.query("SELECT seller_id, store_name FROM sellers WHERE seller_id = $1", [id]);
    if (checkRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: "Seller account not found" });
    }

    const sellerName = checkRes.rows[0].store_name;

    // 2. Perform explicit cleanup for non-cascading dependencies if any
    // Note: Most are handled by the new database constraints (ON DELETE CASCADE/SET NULL)
    
    // 3. Final: Delete the seller record
    await client.query("DELETE FROM sellers WHERE seller_id = $1", [id]);

    // 4. Log the action in audit logs
    await client.query(`
      INSERT INTO audit_logs (audit_id, admin_id, table_name, record_id, action, new_values, created_at)
      VALUES (gen_random_uuid(), $1, 'sellers', $2, 'DELETE_SELLER', $3, NOW())
    `, [req.user.id, id, JSON.stringify({ store_name: sellerName })]);

    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: "Seller account and associated data removed successfully" });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("DELETE SELLER ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete seller account. " + error.message });
  } finally {
    client.release();
  }
};
/**
 * Get All Products (Admin View)
 */
export const getAdminProducts = async (req, res) => {
  try {
    const productsQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        s.store_name as seller_name,
        (SELECT json_agg(pi.* ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.product_id) as pi_images,
        (SELECT json_agg(pv.*) FROM product_variants pv WHERE pv.product_id = p.product_id) as variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN sellers s ON p.seller_id = s.seller_id
      WHERE p.deleted_at IS NULL
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(productsQuery);



    const products = result.rows.map(p => ({
      ...p,
      id: p.product_id,
      thumbnail: p.pi_images && p.pi_images.length > 0 ? p.pi_images[0].image_url : (p.images && p.images.length > 0 ? p.images[0] : null),
      stock: p.stock_quantity || 0,
      status: p.is_active ? "Active" : "Inactive"
    }));


    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("GET ADMIN PRODUCTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch admin products" });
  }
};

/**
 * Change Admin Password
 */
export const changeAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Check if requester is Super Admin
    if (!req.user || req.user.type !== 'super_admin') {
      return res.status(403).json({ success: false, message: "Unauthorized: Only Super Administrators can change passwords." });
    }

    if (!isPasswordStrong(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." 
      });
    }

    // Check if target is an admin or another super admin
    const adminCheck = await pool.query("SELECT admin_id FROM admins WHERE admin_id = $1", [id]);
    const saCheck = await pool.query("SELECT super_admin_id FROM super_admins WHERE super_admin_id = $1", [id]);

    const table = adminCheck.rows.length > 0 ? 'admins' : (saCheck.rows.length > 0 ? 'super_admins' : null);
    const idCol = adminCheck.rows.length > 0 ? 'admin_id' : (saCheck.rows.length > 0 ? 'super_admin_id' : null);

    if (!table) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    // Fetch target details for email
    const targetInfo = await pool.query(`SELECT name, email FROM ${table} WHERE ${idCol} = $1`, [id]);
    const { name, email } = targetInfo.rows[0];

    await pool.query(
      `UPDATE ${table} SET password_hash = crypt($1, gen_salt('bf')), updated_at = NOW() WHERE ${idCol} = $2`,
      [newPassword, id]
    );

    // Send automated email via Nodemailer
    await sendAdminPasswordResetEmail(email, name, newPassword);

    await logAudit({
      admin_id: req.user.id,
      action: 'PASSWORD_RESET',
      table_name: table,
      record_id: id,
      req
    });

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update password" });
  }
};

/**
 * Super Admin: Get All Administrators
 */
export const getAllAdministrators = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT admin_id as id, name, email, role, is_active, last_login_at, created_at FROM admins ORDER BY created_at DESC"
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("GET ALL ADMINS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch administrators" });
  }
};

/**
 * Super Admin: Update Administrator Status (Block/Unblock)
 */
export const updateAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(
      "UPDATE admins SET is_active = $1, updated_at = NOW() WHERE admin_id = $2 AND is_active != $1",
      [is_active, id]
    );

    if (result.rowCount === 0) {
      const check = await pool.query("SELECT is_active FROM admins WHERE admin_id = $1", [id]);
      if (check.rowCount > 0) {
        return res.status(200).json({
          success: true,
          message: `Administrator is already ${is_active ? 'active' : 'blocked'}`,
          is_active: check.rows[0].is_active
        });
      }
      return res.status(404).json({ success: false, message: "Administrator not found" });
    }

    await logAudit({
      admin_id: req.user.id,
      action: is_active ? 'UNBLOCK_ADMIN' : 'BLOCK_ADMIN',
      table_name: 'admins',
      record_id: id,
      req
    });

    return res.status(200).json({ success: true, message: `Administrator ${is_active ? 'unblocked' : 'blocked'} successfully` });
  } catch (error) {
    console.error("UPDATE ADMIN STATUS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update administrator status" });
  }
};

/**
 * Super Admin: Delete Administrator
 */
export const deleteAdministrator = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // 1. Delete associated notifications
    await client.query("DELETE FROM notifications WHERE admin_id = $1", [id]);

    // 2. Nullify references in return_requests
    await client.query("UPDATE return_requests SET resolved_by_admin_id = NULL WHERE resolved_by_admin_id = $1", [id]);

    // 3. Nullify references in seller_payouts
    await client.query("UPDATE seller_payouts SET initiated_by_admin_id = NULL WHERE initiated_by_admin_id = $1", [id]);

    // 3.5. Nullify references in audit_logs
    await client.query("UPDATE audit_logs SET admin_id = NULL WHERE admin_id = $1", [id]);

    // 4. Delete the admin record
    await client.query("DELETE FROM admins WHERE admin_id = $1", [id]);

    // 5. Delete shadow customer record
    await client.query("DELETE FROM customers WHERE customer_id = $1", [id]);

    await logAudit({
      admin_id: req.user.id,
      action: 'DELETE_ADMIN',
      table_name: 'admins',
      record_id: id,
      req
    });

    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: "Administrator account deleted permanently" });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("DELETE ADMIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete administrator account" });
  } finally {
    client.release();
  }
};

/**
 * Bulk Update Orders
 */
export const bulkUpdateOrders = async (req, res) => {
  try {
    const { orderIds, status, courier } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: "No orders selected" });
    }

    // Security: Validation for status and courier
    const allowedStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
    const allowedCouriers = ['Delhivery', 'BlueDart', 'Ecom Express', 'Shadowfax', 'Xpressbees', 'Shiprocket', 'Bulk Update', 'Other'];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid order status" });
    }
    if (courier && !allowedCouriers.includes(courier)) {
      return res.status(400).json({ success: false, message: "Invalid courier name" });
    }

    let query = `UPDATE orders SET updated_at = NOW()`;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += `, order_status = $${paramIndex++}`;
      params.push(status);
    }
    if (courier) {
      query += `, courier = $${paramIndex++}`;
      params.push(courier);
    }

    query += ` WHERE order_id = ANY($${paramIndex}) RETURNING order_id`;
    params.push(orderIds);

    const result = await pool.query(query, params);

    // Sync with deliveries table for bulk actions
    if (status) {
      await pool.query(`
            INSERT INTO deliveries (delivery_id, order_id, courier_name, awb_code, shipping_status, dispatched_at, delivered_at, updated_at, created_at)
            SELECT gen_random_uuid(), id, $1, 'N/A', $2::varchar, 
                CASE WHEN $2::varchar = 'Shipped' OR $2::varchar = 'Delivered' THEN NOW() ELSE NULL END,
                CASE WHEN $2::varchar = 'Delivered' THEN NOW() ELSE NULL END,
                NOW(), NOW()
            FROM unnest($3::uuid[]) as id
            ON CONFLICT (order_id) DO UPDATE SET
                courier_name = EXCLUDED.courier_name,
                shipping_status = EXCLUDED.shipping_status,
                dispatched_at = COALESCE(deliveries.dispatched_at, EXCLUDED.dispatched_at),
                delivered_at = COALESCE(deliveries.delivered_at, EXCLUDED.delivered_at),
                updated_at = NOW()
        `, [courier || 'Bulk Update', status, orderIds]);

      // Dispatch notifications to customers and sellers
      for (const orderId of orderIds) {
        await sendOrderStatusNotifications(orderId, status, pool, courier);
      }
    }

    // Log the bulk action
    await logAudit({
      admin_id: req.user.id,
      action: 'BULK_UPDATE',
      table_name: 'orders',
      record_id: null,
      new_values: { updated_count: result.rowCount, orderIds },
      req
    });

    return res.status(200).json({
      success: true,
      message: `Successfully updated ${result.rowCount} orders`,
      updatedCount: result.rowCount
    });

  } catch (error) {
    console.error("BULK UPDATE ORDERS ERROR:", error);
    return res.status(500).json({ success: false, message: "Internal server error during bulk update" });
  }
};

// Export yearly transactions as a professional bank statement CSV
export const exportFinanceReport = async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  try {
    const query = `
      SELECT 
        ft.created_at,
        ft.transaction_type,
        ft.amount,
        o.order_id as order_ref,
        sp.payout_id as payout_ref,
        sp.transaction_ref as utr,
        s.store_name,
        o.payment_method
      FROM finance_transactions ft
      LEFT JOIN orders o ON ft.order_id = o.order_id
      LEFT JOIN seller_payouts sp ON ft.seller_payout_id = sp.payout_id
      LEFT JOIN sellers s ON sp.seller_id = s.seller_id
      WHERE EXTRACT(YEAR FROM ft.created_at) = $1
      ORDER BY ft.created_at ASC
    `;
    const result = await pool.query(query, [year]);

    if (result.rows.length === 0) {
      return res.status(200).send("Date,Description,Reference,Debit (₹),Credit (₹),Balance (₹)\nNo transactions found for this year.");
    }

    const csvRows = [
      `FINANCIAL STATEMENT - YEAR ${year}`,
      `Generated on: ${new Date().toLocaleString()}`,
      "",
      "Date,Description,Reference,Debit (₹),Credit (₹),Balance (₹)"
    ];

    let runningBalance = 0;

    for (const row of result.rows) {
      const date = new Date(row.created_at).toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }).replace(',', '');

      let description = "";
      let reference = "";
      let debit = "";
      let credit = "";

      if (row.transaction_type === 'payout') {
        description = `Payout to ${row.store_name || 'Seller'}`;
        reference = row.utr || row.payout_ref || 'N/A';
        debit = parseFloat(row.amount).toFixed(2);
        runningBalance -= parseFloat(row.amount);
      } else {
        description = `Order Payment - ${row.payment_method || 'Online'}`;
        reference = row.order_ref || 'N/A';
        credit = parseFloat(row.amount).toFixed(2);
        runningBalance += parseFloat(row.amount);
      }

      const line = [
        `"${date}"`,
        `"${description}"`,
        `"${reference}"`,
        debit ? `"${debit}"` : "",
        credit ? `"${credit}"` : "",
        `"${runningBalance.toFixed(2)}"`
      ];
      csvRows.push(line.join(','));
    }

    const csvString = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Bank_Statement_${year}.csv`);
    res.status(200).send(csvString);

  } catch (error) {
    console.error("EXPORT FINANCE REPORT ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Smart Auto-Dispatch All Pending Orders
 */
export const autoDispatchOrders = async (req, res) => {
  try {
    // 1. Find all 'Processing' orders
    const pendingOrders = await pool.query("SELECT order_id FROM orders WHERE order_status = 'Processing' AND is_deleted = false");

    if (pendingOrders.rows.length === 0) {
      return res.status(200).json({ success: true, message: "No pending orders to dispatch", count: 0 });
    }

    const orderIds = pendingOrders.rows.map(o => o.order_id);
    const results = {
      success: 0,
      failed: 0,
      details: []
    };

    // 2. Process each order through Intelligent Auto-Pilot
    for (const orderId of orderIds) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Intelligent Push (Order -> Serviceability -> AWB -> Pickup)
        const srData = await pushOrderToShiprocket(orderId, client);

        // Update local order status
        await client.query(`
          UPDATE orders 
          SET 
            order_status = 'Shipped', 
            courier = $1, 
            tracking_id = $2,
            updated_at = NOW() 
          WHERE order_id = $3
        `, [srData.courier, srData.awb_code, orderId]);

        // Sync with deliveries table
        await client.query(`
          INSERT INTO deliveries (delivery_id, order_id, courier_name, awb_code, shipping_status, dispatched_at, updated_at, created_at)
          VALUES (gen_random_uuid(), $1, $2, $3, 'Shipped', NOW(), NOW(), NOW())
          ON CONFLICT (order_id) DO UPDATE SET
            courier_name = EXCLUDED.courier_name,
            awb_code = EXCLUDED.awb_code,
            shipping_status = EXCLUDED.shipping_status,
            dispatched_at = NOW(),
            updated_at = NOW()
        `, [orderId, srData.courier, srData.awb_code]);

        // Send notifications
        await sendOrderStatusNotifications(orderId, 'Shipped', client, srData.courier, srData.awb_code);

        await client.query('COMMIT');
        results.success++;
        results.details.push({ orderId, status: 'Success', courier: srData.courier });

      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Auto-Dispatch Error for Order ${orderId}:`, err.message);
        results.failed++;
        results.details.push({ orderId, status: 'Failed', error: "Shiprocket dispatch failed" });
      } finally {
        client.release();
      }
    }

    // 3. Log the bulk action
    await logAudit({
      admin_id: req.user.id,
      action: 'AUTO_DISPATCH_SHIPROCKET',
      table_name: 'orders',
      record_id: `Processed ${orderIds.length} orders`,
      details: results,
      req
    });

    return res.status(200).json({
      success: true,
      message: `Intelligent Auto-Pilot completed: ${results.success} success, ${results.failed} failed.`,
      summary: results
    });

  } catch (error) {
    console.error("AUTO DISPATCH GLOBAL ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to initiate auto-dispatch" });
  }
};

/**
 * Update Master Security Key
 */
export const updateMasterKey = async (req, res) => {
  try {
    const { newMasterKey } = req.body;

    if (!req.user || req.user.type !== 'super_admin') {
      return res.status(403).json({ success: false, message: "Unauthorized: Only Super Administrators can change the Master Key." });
    }

    if (!newMasterKey || newMasterKey.length < 8) {
      return res.status(400).json({ success: false, message: "Master Key must be at least 8 characters for security." });
    }

    await pool.query(
      "UPDATE super_admins SET master_key = $1, updated_at = NOW()",
      [newMasterKey]
    );

    await logAudit({
      admin_id: req.user.id,
      action: 'UPDATE_MASTER_KEY',
      table_name: 'super_admins',
      record_id: null,
      new_values: { detail: 'MASTER_SECURITY_KEY_ROTATED' },
      req
    });

    res.json({ success: true, message: "Master Security Key updated successfully." });
  } catch (error) {
    console.error("UPDATE MASTER KEY ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Update Admin Password (Self)
 */
export const updateAdminPasswordSelf = async (req, res) => {
  try {
    const { id, type } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new passwords are required." });
    }

    if (!isPasswordStrong(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: "New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." 
      });
    }

    const table = type === 'super_admin' ? 'super_admins' : 'admins';
    const idCol = type === 'super_admin' ? 'super_admin_id' : 'admin_id';

    const result = await pool.query(`SELECT password_hash, name, email FROM ${table} WHERE ${idCol} = $1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const user = result.rows[0];
    const passwordMatch = await pool.query("SELECT crypt($1, $2) = $2 AS match", [currentPassword, user.password_hash]);

    if (!passwordMatch.rows[0].match) {
      return res.status(401).json({ success: false, message: "Invalid current password" });
    }

    await pool.query(
      `UPDATE ${table} SET password_hash = crypt($1, gen_salt('bf')), updated_at = NOW() WHERE ${idCol} = $2`,
      [newPassword, id]
    );

    await logAudit({
      admin_id: id,
      action: 'UPDATE_OWN_PASSWORD',
      table_name: table,
      record_id: id,
      req
    });
    // Send notification to super admins
    await pool.query(
      `INSERT INTO notifications (notification_id, type, message, created_at, is_read) 
       VALUES (gen_random_uuid(), 'ADMIN_PASSWORD_CHANGED', $1, NOW(), false)`,
      [`Administrator ${user.name || 'Unknown'} (${user.email || 'Unknown'}) has changed their password.`]
    );

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("UPDATE PASSWORD SELF ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update password" });
  }
};
