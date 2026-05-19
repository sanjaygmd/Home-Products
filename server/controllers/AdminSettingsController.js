import { pool } from '../configs/db.js';

export const getAdminSettings = async (req, res) => {
    const { adminId } = req.params;
    if (req.user.type !== 'super_admin' && req.user.id !== adminId) {
        return res.status(403).json({ success: false, message: "Unauthorized: You can only access your own settings." });
    }

    try {
        const result = await pool.query(
            "SELECT key, value FROM admin_settings WHERE admin_id = $1 OR admin_id IS NULL",
            [adminId]
        );
        
        // Merge settings: admin-specific overrides global (if any global settings are added later)
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        console.error('GET SETTINGS ERROR:', error);
        res.status(500).json({ success: false, message: "Error fetching settings" });
    }
};

export const updateAdminSettings = async (req, res) => {
    const { adminId } = req.params;
    const { settings } = req.body; 

    if (req.user.type !== 'super_admin' && req.user.id !== adminId) {
        return res.status(403).json({ success: false, message: "Unauthorized: You can only update your own settings." });
    }

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            for (const [key, value] of Object.entries(settings)) {
                await client.query(
                    `INSERT INTO admin_settings (admin_id, key, value, updated_at)
                     VALUES ($1, $2, $3, NOW())
                     ON CONFLICT (admin_id, key) 
                     DO UPDATE SET value = $3, updated_at = NOW()`,
                    [adminId, key, JSON.stringify(value)]
                );
            }
            
            await client.query('COMMIT');
            res.status(200).json({ success: true, message: "Settings updated successfully" });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('UPDATE SETTINGS ERROR:', error);
        res.status(500).json({ success: false, message: "Error updating settings" });
    }
};


export const getAdminNotifications = async (req, res) => {
    const { adminId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    if (req.user.type !== 'super_admin' && req.user.id !== adminId) {
        return res.status(403).json({ success: false, message: "Unauthorized: You can only access your own notifications." });
    }

    try {
        const result = await pool.query(
            "SELECT * FROM notifications WHERE admin_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            [adminId, limit, offset]
        );
        res.status(200).json({ success: true, data: result.rows, pagination: { page, limit } });
    } catch (error) {
        console.error('GET NOTIFICATIONS ERROR:', error);
        res.status(500).json({ success: false, message: "Error fetching notifications" });
    }
};
