import { pool } from '../configs/db.js';

// Helper: get or create cart for customer
const getOrCreateCart = async (client, customer_id) => {
  const existing = await client.query('SELECT cart_id FROM cart WHERE customer_id = $1', [customer_id]);
  if (existing.rows.length > 0) {
    return existing.rows[0].cart_id;
  }
  const result = await client.query(
    `INSERT INTO cart (cart_id, customer_id)
     VALUES (gen_random_uuid(), $1)
     RETURNING cart_id`,
    [customer_id]
  );
  return result.rows[0].cart_id;
};

// Helper: sync cart total_amount and item_count
const syncCartSummary = async (client, cart_id) => {
  const summary = await client.query(
    `SELECT 
        COALESCE(SUM(quantity), 0) as total_items,
        COALESCE(SUM(quantity * price), 0) as total_amount
     FROM cart_items 
     WHERE cart_id = $1`,
    [cart_id]
  );

  const { total_items, total_amount } = summary.rows[0];

  await client.query(
    `UPDATE cart 
     SET total_amount = $1, 
         item_count = $2, 
         updated_at = NOW() 
     WHERE cart_id = $3`,
    [total_amount, total_items, cart_id]
  );
};


// GET /cart/:customer_id
export const getCart = async (req, res) => {
    const { customer_id } = req.params;

    if (req.user.type === 'customer' && req.user.id !== customer_id) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to cart' });
    }

    try {
        const result = await pool.query(
            `SELECT 
                ci.cart_item_id,
                ci.quantity,
                ci.price,
                ci.variant_id,
                p.product_id,
                p.name,
                p.slug,
                p.brand,
                p.mrp,
                p.color,
                p.seller_id,
                COALESCE(
                    (SELECT image_url FROM product_images 
                     WHERE product_id = p.product_id 
                     AND (variant_id = ci.variant_id OR variant_id IS NULL) 
                     ORDER BY sort_order LIMIT 1),
                    'https://via.placeholder.com/400'
                ) AS thumbnail,
                pv.variant_name,
                pv.variant_value
            FROM cart c
            JOIN cart_items ci ON c.cart_id = ci.cart_id
            LEFT JOIN products p ON ci.product_id = p.product_id
            LEFT JOIN product_variants pv ON ci.variant_id = pv.variant_id
            WHERE c.customer_id = $1
            ORDER BY ci.created_at ASC`,
            [customer_id]
        );

        // Fetch cart summary
        const cartInfo = await pool.query('SELECT total_amount, item_count, updated_at FROM cart WHERE customer_id = $1', [customer_id]);
        
        return res.status(200).json({ 
            success: true, 
            cart_summary: cartInfo.rows[0] || { total_amount: 0, item_count: 0 },
            data: result.rows 
        });
    } catch (error) {
        console.error('FETCH CART ERROR:', error);
        return res.status(500).json({ success: false, message: 'Error fetching cart' });
    }
};

// POST /cart/add
export const addToCart = async (req, res) => {
    let { customer_id, product_id, variant_id, quantity, price } = req.body;
    
    quantity = parseInt(quantity) || 1;
    price = parseFloat(price);

    if (!customer_id || !product_id || !price) {
        return res.status(400).json({ success: false, message: 'customer_id, product_id and price are required' });
    }

    if (req.user.type === 'customer' && req.user.id !== customer_id) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You can only add items to your own cart' });
    }


    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const cart_id = await getOrCreateCart(client, customer_id);

        // Check if same product+variant already in cart
        const existing = await client.query(
            `SELECT cart_item_id, quantity FROM cart_items 
             WHERE cart_id = $1 AND product_id = $2 AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))`,
            [cart_id, product_id, variant_id || null]
        );

        if (existing.rows.length > 0) {
            // Increment quantity
            await client.query(
                'UPDATE cart_items SET quantity = quantity + $1, updated_at = NOW() WHERE cart_item_id = $2',
                [quantity || 1, existing.rows[0].cart_item_id]
            );
        } else {
            // Insert new item with explicit UUID
            await client.query(
                `INSERT INTO cart_items (cart_item_id, cart_id, product_id, variant_id, quantity, price)
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
                [cart_id, product_id, variant_id || null, quantity || 1, price]
            );
        }

        // Sync cart totals
        await syncCartSummary(client, cart_id);

        await client.query('COMMIT');
        // Fetch updated cart items
        const cartResult = await pool.query(
            `SELECT 
                ci.cart_item_id,
                ci.quantity,
                ci.price,
                ci.variant_id,
                p.product_id,
                p.name,
                p.slug,
                p.brand,
                p.mrp,
                p.color,
                p.seller_id,
                COALESCE(
                    (SELECT image_url FROM product_images 
                     WHERE product_id = p.product_id 
                     AND (variant_id = ci.variant_id OR variant_id IS NULL) 
                     ORDER BY sort_order LIMIT 1),
                    'https://via.placeholder.com/400'
                ) AS thumbnail,
                pv.variant_name,
                pv.variant_value
            FROM cart c
            JOIN cart_items ci ON c.cart_id = ci.cart_id
            JOIN products p ON ci.product_id = p.product_id
            LEFT JOIN product_variants pv ON ci.variant_id = pv.variant_id
            WHERE c.cart_id = $1
            ORDER BY ci.created_at ASC`,
            [cart_id]
        );
        
        const cartInfo = await pool.query('SELECT total_amount, item_count, updated_at FROM cart WHERE cart_id = $1', [cart_id]);

        return res.status(200).json({ 
            success: true, 
            message: 'Item added to cart', 
            cart_summary: cartInfo.rows[0],
            data: cartResult.rows 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('ADD TO CART ERROR:', error);
        return res.status(500).json({ success: false, message: 'Error adding to cart' });
    } finally {
        client.release();
    }
};

// PATCH /cart/update
export const updateCartItem = async (req, res) => {
    const { cart_item_id, quantity } = req.body;

    if (!cart_item_id || quantity === undefined) {
        return res.status(400).json({ success: false, message: 'cart_item_id and quantity are required' });
    }

    const client = await pool.connect();
    try {
        // Ownership Check
        const ownershipCheck = await client.query(
            "SELECT c.customer_id FROM cart c JOIN cart_items ci ON c.cart_id = ci.cart_id WHERE ci.cart_item_id = $1",
            [cart_item_id]
        );

        if (ownershipCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
        }

        if (req.user.type === 'customer' && ownershipCheck.rows[0].customer_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this cart item' });
        }

        await client.query('BEGIN');

        let result;
        if (quantity <= 0) {
            result = await client.query('DELETE FROM cart_items WHERE cart_item_id = $1 RETURNING cart_id', [cart_item_id]);
        } else {
            // Update quantity in cart_items
            result = await client.query(
                'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE cart_item_id = $2 RETURNING cart_id',
                [quantity, cart_item_id]
            );
        }

        if (result.rows.length > 0) {
            const cart_id = result.rows[0].cart_id;
            await syncCartSummary(client, cart_id);
        }

        await client.query('COMMIT');
        return res.status(200).json({ 
            success: true, 
            message: quantity <= 0 ? 'Item removed from cart' : 'Cart item updated' 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('UPDATE CART ITEM ERROR:', error);
        return res.status(500).json({ success: false, message: 'Error updating cart item' });
    } finally {
        client.release();
    }
};

// DELETE /cart/remove/:cart_item_id
export const removeFromCart = async (req, res) => {
    const { cart_item_id } = req.params;
    const client = await pool.connect();
    try {
        // Ownership Check
        const ownershipCheck = await client.query(
            "SELECT c.customer_id FROM cart c JOIN cart_items ci ON c.cart_id = ci.cart_id WHERE ci.cart_item_id = $1",
            [cart_item_id]
        );

        if (ownershipCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
        }

        if (req.user.type === 'customer' && ownershipCheck.rows[0].customer_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this cart item' });
        }

        await client.query('BEGIN');

        const result = await client.query('DELETE FROM cart_items WHERE cart_item_id = $1 RETURNING cart_id', [cart_item_id]);
        
        if (result.rows.length > 0) {
            const cart_id = result.rows[0].cart_id;
            await syncCartSummary(client, cart_id);
        }
        
        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Item removed from cart' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('REMOVE FROM CART ERROR:', error);
        return res.status(500).json({ success: false, message: 'Error removing from cart' });
    } finally {
        client.release();
    }
};

// DELETE /cart/clear/:customer_id
export const clearCart = async (req, res) => {
    const { customer_id } = req.params;

    if (req.user.type === 'customer' && req.user.id !== customer_id) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You can only clear your own cart' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        
        const cartRes = await client.query('SELECT cart_id FROM cart WHERE customer_id = $1', [customer_id]);
        if (cartRes.rows.length > 0) {
            const cart_id = cartRes.rows[0].cart_id;
            await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cart_id]);
            await client.query(
                `UPDATE cart SET total_amount = 0, item_count = 0, updated_at = NOW() WHERE cart_id = $1`,
                [cart_id]
            );
        }
        
        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Cart cleared' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('CLEAR CART ERROR:', error);
        return res.status(500).json({ success: false, message: 'Error clearing cart' });
    } finally {
        client.release();
    }
};
