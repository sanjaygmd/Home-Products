import { pool } from '../configs/db.js';
import { sanitizeText, sanitizeDescription } from '../utils/sanitizer.js';

// Get all reviews with product and customer details (Admin)
export const getAllReviews = async (req, res) => {
    try {
        const query = `
            SELECT 
                r.*, 
                p.name as product_name, 
                c.full_name as customer_name,
                c.email as customer_email
            FROM reviews r
            JOIN products p ON r.product_id = p.product_id
            JOIN customers c ON r.customer_id = c.customer_id
            ORDER BY r.created_at DESC
        `;
        const result = await pool.query(query);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('GET ALL REVIEWS ERROR:', error);
        res.status(500).json({ success: false, message: "Error fetching reviews" });
    }
};


// Delete a review (Admin)
export const deleteReview = async (req, res) => {
    const { id } = req.params;
    try {
        const check = await pool.query("SELECT 1 FROM reviews WHERE review_id = $1", [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        await pool.query("DELETE FROM reviews WHERE review_id = $1", [id]);
        res.status(200).json({ success: true, message: "Review deleted successfully" });
    } catch (error) {
        console.error('DELETE REVIEW ERROR:', error);
        res.status(500).json({ success: false, message: "Error deleting review" });
    }
};


// Get reviews for a specific product (Public/Seller)
export const getProductReviews = async (req, res) => {
    const { productId } = req.params;
    const { variantId } = req.query; // Optional variant filter

    try {
        let query = `
            SELECT 
                r.*, 
                c.full_name as customer_name,
                pv.variant_name,
                pv.variant_value
            FROM reviews r
            JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN product_variants pv ON r.variant_id = pv.variant_id
            WHERE r.product_id = $1
        `;
        const params = [productId];

        // If a specific variantId is provided, filter strictly by it.
        // If no variantId is provided, show ALL reviews for the product (Aggregator mode).
        if (variantId && variantId !== 'null') {
            query += ` AND r.variant_id = $2`;
            params.push(variantId);
        }

        query += ` ORDER BY r.created_at DESC`;
        
        const result = await pool.query(query, params);
        
        const sanitizedRows = result.rows.map(row => {
            const names = row.customer_name ? row.customer_name.split(' ') : ['Guest'];
            return {
                ...row,
                customer_name: names[0] + (names.length > 1 ? ' ' + names[1].charAt(0) + '.' : '')
            };
        });

        res.status(200).json({ success: true, data: sanitizedRows });
    } catch (error) {
        console.error('GET PRODUCT REVIEWS ERROR:', error);
        res.status(500).json({ success: false, message: "Error fetching product reviews" });
    }
};

// Add a new review (Customer)
export const addReview = async (req, res) => {
    const { product_id, order_item_id, rating, title, body, variant_id } = req.body;
    const customer_id = req.user.id; // From verifyToken middleware

    // Parse and validate rating: integer between 1 and 5
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5." });
    }

    // Sanitize input to prevent XSS
    const sanitizedTitle = sanitizeText(title);
    const sanitizedBody = sanitizeDescription(body);

    try {
        // Security Fix: Check if customer has a verified purchase for this product
        const purchaseCheck = await pool.query(
            `SELECT oi.order_item_id
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.order_id
             WHERE o.customer_id = $1 
               AND oi.product_id = $2 
               AND o.order_status = 'Delivered'
             LIMIT 1`,
            [customer_id, product_id]
        );

        if (purchaseCheck.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: "You can only review products that have been delivered to you." 
            });
        }

        const validated_order_item_id = purchaseCheck.rows[0].order_item_id;

        // Check if review already exists for this product by this customer
        const existing = await pool.query(
            "SELECT * FROM reviews WHERE product_id = $1 AND customer_id = $2",
            [product_id, customer_id]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: "You have already reviewed this product" });
        }

        const query = `
            INSERT INTO reviews (review_id, product_id, customer_id, order_item_id, rating, title, body, created_at, variant_id)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), $7)
            RETURNING *
        `;
        const result = await pool.query(query, [product_id, customer_id, validated_order_item_id, parsedRating, sanitizedTitle, sanitizedBody, variant_id || null]);
        
        // Update product rating and reviews_count dynamically
        await pool.query(
            `UPDATE products 
             SET reviews_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1),
                 rating = COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = $1), 0)
             WHERE product_id = $1`,
            [product_id]
        );
        
        res.status(201).json({ success: true, message: "Review submitted successfully", data: result.rows[0] });
    } catch (error) {
        console.error('ADD REVIEW ERROR:', error);
        res.status(500).json({ success: false, message: "Error submitting review" });
    }
};


// Check if customer can review a product
export const checkCanReview = async (req, res) => {
    const { productId } = req.params;
    const customer_id = req.user.id;

    try {
        // First check if they already reviewed this product
        const alreadyReviewed = await pool.query(
            "SELECT * FROM reviews WHERE customer_id = $1 AND product_id = $2",
            [customer_id, productId]
        );

        if (alreadyReviewed.rows.length > 0) {
            return res.status(200).json({ 
                success: true, 
                canReview: false, 
                alreadyReviewed: true,
                review: alreadyReviewed.rows[0]
            });
        }

        // Find an order item for this product that doesn't have a review yet
        const query = `
            SELECT oi.order_item_id
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.customer_id = $1 
              AND oi.product_id = $2 
              AND o.order_status = 'Delivered'
            LIMIT 1
        `;
        const result = await pool.query(query, [customer_id, productId]);

        if (result.rows.length > 0) {
            res.status(200).json({ success: true, canReview: true, orderItemId: result.rows[0].order_item_id });
        } else {
            res.status(200).json({ success: true, canReview: false });
        }
    } catch (error) {
        console.error('CHECK CAN REVIEW ERROR:', error);
        res.status(500).json({ success: false, message: "Error checking review eligibility" });
    }
};

// Update a review (Customer)
export const updateReview = async (req, res) => {
    const { id } = req.params;
    const { rating, title, body } = req.body;
    const customer_id = req.user.id;

    // Parse and validate rating: integer between 1 and 5
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5." });
    }

    // Sanitize input to prevent XSS
    const sanitizedTitle = sanitizeText(title);
    const sanitizedBody = sanitizeDescription(body);

    try {
        // Ensure the review belongs to the customer
        const check = await pool.query("SELECT * FROM reviews WHERE review_id = $1 AND customer_id = $2", [id, customer_id]);
        if (check.rows.length === 0) {
            return res.status(403).json({ success: false, message: "Unauthorized to edit this review" });
        }

        const query = `
            UPDATE reviews 
            SET rating = $1, title = $2, body = $3
            WHERE review_id = $4
            RETURNING *
        `;
        const result = await pool.query(query, [parsedRating, sanitizedTitle, sanitizedBody, id]);
        res.status(200).json({ success: true, message: "Review updated successfully", data: result.rows[0] });
    } catch (error) {
        console.error('UPDATE REVIEW ERROR:', error);
        res.status(500).json({ success: false, message: "Error updating review" });
    }
};




