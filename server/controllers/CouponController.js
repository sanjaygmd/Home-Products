import { pool } from '../configs/db.js';
import { logAudit } from '../utils/auditLogger.js';

// Get all active coupons
export const getActiveCoupons = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM coupons WHERE is_active = true AND (valid_until IS NULL OR (valid_until + interval '23 hours 59 minutes 59 seconds') >= NOW()) ORDER BY created_at DESC"
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('FETCH COUPONS ERROR:', error);
        res.status(500).json({ success: false, message: "Failed to fetch coupons" });
    }
};


// Validate and get coupon by code
export const validateCoupon = async (req, res) => {
    const { code, subtotal } = req.body;
    try {
        const result = await pool.query(
            "SELECT * FROM coupons WHERE code = $1",
            [code.toUpperCase()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Invalid coupon code" });
        }

        const coupon = result.rows[0];

        if (!coupon.is_active) {
            return res.status(400).json({ success: false, message: "This coupon is currently inactive" });
        }

        // Check expiry (Set to end of the day for valid_until to be inclusive)
        if (coupon.valid_until) {
            const expiryDate = new Date(coupon.valid_until);
            // If the time is exactly midnight, assume the admin meant the whole day
            if (expiryDate.getHours() === 0 && expiryDate.getMinutes() === 0) {
                expiryDate.setHours(23, 59, 59, 999);
            }
            
            if (expiryDate < new Date()) {
                return res.status(400).json({ success: false, message: "Coupon has expired" });
            }
        }

        // Check usage limit (Total)
        if (coupon.max_usage && coupon.used_count >= coupon.max_usage) {
            return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
        }

        // Check if customer already used this coupon (Individual)
        if (req.user && req.user.id) {
            const usageCheck = await pool.query(
                "SELECT 1 FROM coupon_usage WHERE coupon_id = $1 AND customer_id = $2",
                [coupon.coupon_id, req.user.id]
            );
            if (usageCheck.rows.length > 0) {
                return res.status(400).json({ success: false, message: "You have already used this coupon" });
            }
        }

        // Check minimum order value
        if (subtotal && subtotal < parseFloat(coupon.min_order_value)) {
            return res.status(400).json({ 
                success: false, 
                message: `Minimum order value of ₹${coupon.min_order_value} required for this coupon` 
            });
        }

        res.status(200).json({ success: true, data: coupon });
    } catch (error) {
        console.error('VALIDATE COUPON ERROR:', error);
        res.status(500).json({ success: false, message: "Error validating coupon" });
    }
};


// For Admin: Get all coupons (including inactive)
export const getAllCoupons = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM coupons ORDER BY created_at DESC");
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('FETCH ALL COUPONS ERROR:', error);
        res.status(500).json({ success: false, message: "Failed to fetch all coupons" });
    }
};


// Create a new coupon
export const createCoupon = async (req, res) => {
    const { code, type, discount_percent, max_discount, min_order_value, valid_until, max_usage, is_active, admin_id } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO coupons (coupon_id, code, type, discount_percent, max_discount, min_order_value, valid_until, max_usage, is_active, admin_id, created_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             RETURNING *`,
            [code.toUpperCase(), type || 'percentage', discount_percent, max_discount, min_order_value, valid_until, max_usage, is_active ?? true, admin_id]
        );
        
        const newCoupon = result.rows[0];
        
        // Audit log
        await logAudit({
            admin_id,
            action: 'CREATE_COUPON',
            table_name: 'coupons',
            record_id: newCoupon.coupon_id,
            new_values: newCoupon,
            req
        });

        res.status(201).json({ success: true, message: "Coupon created successfully", data: newCoupon });
    } catch (error) {
        console.error('CREATE COUPON ERROR:', error);
        res.status(500).json({ success: false, message: "Failed to create coupon" });
    }
};


// Update a coupon
export const updateCoupon = async (req, res) => {
    const { id } = req.params;
    const { code, type, discount_percent, max_discount, min_order_value, valid_until, max_usage, is_active, admin_id } = req.body;
    try {
        // Get old values first
        const oldRes = await pool.query("SELECT * FROM coupons WHERE coupon_id = $1", [id]);
        if (oldRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }
        const oldCoupon = oldRes.rows[0];

        const result = await pool.query(
            `UPDATE coupons 
             SET code = COALESCE($1, code),
                 type = COALESCE($2, type),
                 discount_percent = COALESCE($3, discount_percent),
                 max_discount = COALESCE($4, max_discount),
                 min_order_value = COALESCE($5, min_order_value),
                 valid_until = COALESCE($6, valid_until),
                 max_usage = COALESCE($7, max_usage),
                 is_active = COALESCE($8, is_active),
                 admin_id = COALESCE($9, admin_id),
                 updated_at = NOW()
             WHERE coupon_id = $10
             RETURNING *`,
            [code?.toUpperCase(), type, discount_percent, max_discount, min_order_value, valid_until, max_usage, is_active, admin_id, id]
        );
        
        const updatedCoupon = result.rows[0];

        // Audit log
        await logAudit({
            admin_id: admin_id || updatedCoupon.admin_id,
            action: 'UPDATE_COUPON',
            table_name: 'coupons',
            record_id: id,
            old_values: oldCoupon,
            new_values: updatedCoupon,
            req
        });

        res.status(200).json({ success: true, message: "Coupon updated successfully", data: updatedCoupon });
    } catch (error) {
        console.error('UPDATE COUPON ERROR:', error);
        res.status(500).json({ success: false, message: "Failed to update coupon" });
    }
};


// Delete a coupon
export const deleteCoupon = async (req, res) => {
    const { id } = req.params;
    const { admin_id } = req.query; // Passed in URL query
    try {
        const result = await pool.query("DELETE FROM coupons WHERE coupon_id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        const deletedCoupon = result.rows[0];

        // Audit log
        await logAudit({
            admin_id,
            action: 'DELETE_COUPON',
            table_name: 'coupons',
            record_id: id,
            old_values: deletedCoupon,
            req
        });

        res.status(200).json({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
        console.error('DELETE COUPON ERROR:', error);
        res.status(500).json({ success: false, message: "Failed to delete coupon" });
    }
};

