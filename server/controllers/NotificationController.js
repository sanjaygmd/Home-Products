import { pool } from '../configs/db.js';

// Get notifications for a customer
export const getCustomerNotifications = async (req, res) => {
    const { customerId } = req.params;
    try {
        const result = await pool.query(
            "SELECT * FROM notifications WHERE customer_id = $1 AND seller_id IS NULL ORDER BY created_at DESC LIMIT 50",
            [customerId]
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('FETCH NOTIFICATIONS ERROR:', error);
        res.status(500).json({ success: false, message: "Error fetching notifications" });
    }
};


// Mark a notification as read
export const markAsRead = async (req, res) => {
    const { notificationId } = req.params;
    try {
        await pool.query(
            "UPDATE notifications SET is_read = true WHERE notification_id = $1",
            [notificationId]
        );
        res.status(200).json({ success: true, message: "Notification marked as read" });
    } catch (error) {
        console.error('UPDATE NOTIFICATION ERROR:', error);
        res.status(500).json({ success: false, message: "Error updating notification" });
    }
};


// Mark all notifications as read for a customer
export const markAllAsRead = async (req, res) => {
    const { customerId } = req.params;
    try {
        await pool.query(
            "UPDATE notifications SET is_read = true WHERE customer_id = $1 AND seller_id IS NULL",
            [customerId]
        );
        res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        console.error('UPDATE ALL NOTIFICATIONS ERROR:', error);
        res.status(500).json({ success: false, message: "Error updating notifications" });
    }
};


// Delete a notification
export const deleteNotification = async (req, res) => {
    const { notificationId } = req.params;
    try {
        await pool.query(
            "DELETE FROM notifications WHERE notification_id = $1",
            [notificationId]
        );
        res.status(200).json({ success: true, message: "Notification deleted" });
    } catch (error) {
        console.error('DELETE NOTIFICATION ERROR:', error);
        res.status(500).json({ success: false, message: "Error deleting notification" });
    }
};

