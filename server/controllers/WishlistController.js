import { pool } from '../configs/db.js';

// Helper: get or create wishlist for customer
const getOrCreateWishlist = async (client, customer_id) => {
  const existing = await client.query('SELECT wishlist_id FROM wishlist WHERE customer_id = $1', [customer_id]);
  if (existing.rows.length > 0) {
    return existing.rows[0].wishlist_id;
  }
  const result = await client.query(
    `INSERT INTO wishlist (wishlist_id, customer_id)
     VALUES (gen_random_uuid(), $1)
     RETURNING wishlist_id`,
    [customer_id]
  );
  return result.rows[0].wishlist_id;
};

// Helper: sync wishlist item_count
const syncWishlistSummary = async (client, wishlist_id) => {
  const summary = await client.query(
    `SELECT COUNT(*) as total_items FROM wishlist_items WHERE wishlist_id = $1`,
    [wishlist_id]
  );

  const { total_items } = summary.rows[0];

  await client.query(
    `UPDATE wishlist 
     SET item_count = $1, 
         updated_at = NOW() 
     WHERE wishlist_id = $2`,
    [total_items, wishlist_id]
  );
};

// GET /wishlist/:customer_id
export const getWishlist = async (req, res) => {
    const { customer_id } = req.params;

    if (req.user.id !== customer_id && !['admin', 'super_admin'].includes(req.user.type)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to wishlist' });
    }

    try {
        const result = await pool.query(
            `SELECT 
                wi.wishlist_item_id,
                wi.product_id,
                wi.variant_id,
                p.name,
                p.slug,
                p.brand,
                p.mrp,
                p.price,
                COALESCE(
                    (SELECT image_url FROM product_images 
                     WHERE product_id = p.product_id 
                     AND (variant_id = wi.variant_id OR variant_id IS NULL) 
                     ORDER BY sort_order LIMIT 1),
                    'https://via.placeholder.com/400'
                ) AS thumbnail,
                pv.variant_name,
                pv.variant_value
            FROM wishlist w
            JOIN wishlist_items wi ON w.wishlist_id = wi.wishlist_id
            JOIN products p ON wi.product_id = p.product_id
            LEFT JOIN product_variants pv ON wi.variant_id = pv.variant_id
            WHERE w.customer_id = $1
            ORDER BY wi.created_at DESC`,
            [customer_id]
        );

        const summary = await pool.query('SELECT item_count, updated_at FROM wishlist WHERE customer_id = $1', [customer_id]);

        return res.status(200).json({ 
            success: true, 
            wishlist_summary: summary.rows[0] || { item_count: 0 },
            data: result.rows 
        });
    } catch (error) {
        console.error('FETCH WISHLIST ERROR:', error);
        return res.status(500).json({ success: false, message: 'Error fetching wishlist' });
    }
};

// POST /wishlist/add
export const addToWishlist = async (req, res) => {
    const { customer_id, product_id, variant_id } = req.body;

    if (!customer_id || !product_id) {
        return res.status(400).json({ success: false, message: 'customer_id and product_id are required' });
    }

    if (req.user.id !== customer_id && !['admin', 'super_admin'].includes(req.user.type)) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You can only add items to your own wishlist' });
    }


    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const wishlist_id = await getOrCreateWishlist(client, customer_id);

        // Check if already in wishlist
        const existing = await client.query(
            `SELECT wishlist_item_id FROM wishlist_items 
             WHERE wishlist_id = $1 AND product_id = $2 AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))`,
            [wishlist_id, product_id, variant_id || null]
        );

        if (existing.rows.length === 0) {
            await client.query(
                `INSERT INTO wishlist_items (wishlist_item_id, wishlist_id, product_id, variant_id)
                 VALUES (gen_random_uuid(), $1, $2, $3)`,
                [wishlist_id, product_id, variant_id || null]
            );
        }

        await syncWishlistSummary(client, wishlist_id);

        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Item added to wishlist' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('ADD TO WISHLIST ERROR:', error);
        return res.status(500).json({ success: false, message: 'Error adding to wishlist' });
    } finally {
        client.release();
    }
};

// DELETE /wishlist/remove/:wishlist_item_id
export const removeFromWishlist = async (req, res) => {
    const { wishlist_item_id } = req.params;
    const client = await pool.connect();
    try {
        // Ownership Check
        const ownershipCheck = await client.query(
            "SELECT w.customer_id FROM wishlist w JOIN wishlist_items wi ON w.wishlist_id = wi.wishlist_id WHERE wi.wishlist_item_id = $1",
            [wishlist_item_id]
        );

        if (ownershipCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Wishlist item not found' });
        }

        if (req.user.id !== ownershipCheck.rows[0].customer_id && !['admin', 'super_admin'].includes(req.user.type)) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this wishlist item' });
        }

        await client.query('BEGIN');

        const result = await client.query('DELETE FROM wishlist_items WHERE wishlist_item_id = $1 RETURNING wishlist_id', [wishlist_item_id]);
        
        if (result.rows.length > 0) {
            const wishlist_id = result.rows[0].wishlist_id;
            await syncWishlistSummary(client, wishlist_id);
        }
        
        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Item removed from wishlist' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('REMOVE FROM WISHLIST ERROR:', error);
        return res.status(500).json({ success: false, message: 'Error removing from wishlist' });
    } finally {
        client.release();
    }
};

// DELETE /wishlist/clear/:customer_id
export const clearWishlist = async (req, res) => {
    const { customer_id } = req.params;

    if (req.user.id !== customer_id && !['admin', 'super_admin'].includes(req.user.type)) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You can only clear your own wishlist' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const wishlistRes = await client.query('SELECT wishlist_id FROM wishlist WHERE customer_id = $1', [customer_id]);
        if (wishlistRes.rows.length > 0) {
            const wishlist_id = wishlistRes.rows[0].wishlist_id;
            await client.query('DELETE FROM wishlist_items WHERE wishlist_id = $1', [wishlist_id]);
            await client.query(
                `UPDATE wishlist SET item_count = 0, updated_at = NOW() WHERE wishlist_id = $1`,
                [wishlist_id]
            );
        }
        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Wishlist cleared' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('CLEAR WISHLIST ERROR:', error);
        return res.status(500).json({ success: false, message: 'Error clearing wishlist' });
    } finally {
        client.release();
    }
};
