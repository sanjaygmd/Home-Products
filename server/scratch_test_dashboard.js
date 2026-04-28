import { pool } from './configs/db.js';

async function testDashboardData() {
    try {
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
        console.log("Stats:", statsResult.rows[0]);
        
        const productsQuery = "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL";
        const productsResult = await pool.query(productsQuery);
        console.log("Direct Products Count:", productsResult.rows[0].count);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testDashboardData();
