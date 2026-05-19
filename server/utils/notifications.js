import { pool } from '../configs/db.js';

/**
 * Automatically dispatch notifications to Customer, Seller(s), and Admin 
 * upon a significant order status change.
 * 
 * @param {string} orderId 
 * @param {string} newStatus (e.g., 'Processing', 'Shipped', 'Delivered', 'Cancelled')
 * @param {object} client DB client (optional)
 * @param {string} courier Optional courier name for shipped status
 * @param {string} trackingId Optional tracking ID for shipped status
 */
export const sendOrderStatusNotifications = async (orderId, newStatus, client = pool, courier = '', trackingId = '') => {
    try {
        // 1. Fetch order and customer details
        const orderRes = await client.query(`
            SELECT o.customer_id, o.total_amount, c.full_name 
            FROM orders o 
            LEFT JOIN customers c ON o.customer_id = c.customer_id 
            WHERE o.order_id = $1
        `, [orderId]);

        if (orderRes.rows.length === 0) return;
        
        const { customer_id } = orderRes.rows[0];
        const shortOrderId = orderId.toString().slice(0, 8).toUpperCase();

        // 2. Fetch distinct sellers involved in the order
        const sellersRes = await client.query(`
            SELECT DISTINCT seller_id FROM order_items WHERE order_id = $1
        `, [orderId]);
        const sellerIds = sellersRes.rows.map(r => r.seller_id);

        // 3. Define Messages
        let customerMsg = `Your order #${shortOrderId} status has been updated to ${newStatus}.`;
        let sellerMsg = `Order #${shortOrderId} status is now ${newStatus}.`;
        let adminMsg = `Order #${shortOrderId} was updated to ${newStatus}.`;
        let notifyType = 'order_update';

        if (newStatus === 'Processing') {
            customerMsg = `Great news! Your order #${shortOrderId} is now being processed.`;
            sellerMsg = `Order #${shortOrderId} is processing. Please prepare items for dispatch.`;
        } else if (newStatus === 'Shipped') {
            notifyType = 'order_shipped';
            customerMsg = `Your order #${shortOrderId} has been shipped!${courier && courier !== 'N/A' && courier !== 'Bulk Update' ? ` Courier: ${courier}.` : ''}${trackingId ? ` Tracking ID: ${trackingId}` : ''}`;
            sellerMsg = `Order #${shortOrderId} has been shipped to the customer.`;
        } else if (newStatus === 'Delivered') {
            notifyType = 'order_delivered';
            customerMsg = `Your order #${shortOrderId} has been delivered. Thank you for shopping with us!`;
            sellerMsg = `Order #${shortOrderId} was successfully delivered.`;
        } else if (newStatus === 'Cancelled') {
            notifyType = 'order_cancelled';
            customerMsg = `Your order #${shortOrderId} has been cancelled.`;
            sellerMsg = `Alert: Order #${shortOrderId} was cancelled.`;
        }

        // 4. Insert Customer Notification
        if (customer_id) {
            await client.query(
                `INSERT INTO notifications (notification_id, customer_id, type, message, created_at, is_read) 
                 VALUES (gen_random_uuid(), $1, $2, $3, NOW(), false)`,
                [customer_id, notifyType, customerMsg]
            );
        }

        // 5. Insert Seller Notifications
        for (const s_id of sellerIds) {
            if (!s_id) continue;
            await client.query(
                `INSERT INTO notifications (notification_id, seller_id, order_id, type, message, created_at, is_read) 
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), false)`,
                [s_id, orderId, notifyType, sellerMsg]
            );
        }

        // 6. Insert Global Admin Notification (Avoid orphan by finding a super admin)
        const adminRes = await client.query("SELECT admin_id FROM admins WHERE role = 'super_admin' LIMIT 1");
        const adminId = adminRes.rows.length > 0 ? adminRes.rows[0].admin_id : null;

        if (adminId) {
            await client.query(
                `INSERT INTO notifications (notification_id, admin_id, type, message, created_at, is_read) 
                 VALUES (gen_random_uuid(), $1, 'admin_alert', $2, NOW(), false)`,
                [adminId, adminMsg]
            );
        }

        console.log(`[NOTIFICATIONS] Dispatched notifications for Order ${shortOrderId} (${newStatus})`);

    } catch (err) {
        console.error("Failed to send order notifications:", err.message);
    }
};
