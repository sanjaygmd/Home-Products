import { pool } from '../configs/db.js';

// Get notifications for a customer
export const getCustomerNotifications = async (req, res) => {
    const { customerId } = req.params;

    // Ownership Check
    if (req.user.id !== customerId && req.user.type !== 'admin') {
        return res.status(403).json({ success: false, message: "Unauthorized access to notifications" });
    }

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
        // Ownership Check
        const noteCheck = await pool.query("SELECT customer_id, seller_id FROM notifications WHERE notification_id = $1", [notificationId]);
        if (noteCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        const note = noteCheck.rows[0];
        if (req.user.id !== note.customer_id && req.user.id !== note.seller_id && req.user.type !== 'admin') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

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

    // Ownership Check
    if (req.user.id !== customerId && req.user.type !== 'admin') {
        return res.status(403).json({ success: false, message: "Unauthorized" });
    }

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
        // Ownership Check
        const noteCheck = await pool.query("SELECT customer_id, seller_id FROM notifications WHERE notification_id = $1", [notificationId]);
        if (noteCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        const note = noteCheck.rows[0];
        if (req.user.id !== note.customer_id && req.user.id !== note.seller_id && req.user.type !== 'admin') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

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

