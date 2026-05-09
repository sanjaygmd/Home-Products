import { pool } from '../configs/db.js';
import { sendCartAddEmail } from '../utils/email.js';

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

    if (req.user.id !== customer_id && !['admin', 'super_admin'].includes(req.user.type)) {
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

    if (req.user.id !== customer_id && !['admin', 'super_admin'].includes(req.user.type)) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You can only add items to your own cart' });
    }


    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch secure authentic price from DB
        let dbPrice = 0;
        if (variant_id) {
            const vCheck = await client.query(
                "SELECT price FROM product_variants WHERE variant_id = $1 AND product_id = $2",
                [variant_id, product_id]
            );
            if (vCheck.rows.length === 0) {
                // Fallback to product price if variant check fails
                const pCheck = await client.query("SELECT price FROM products WHERE product_id = $1", [product_id]);
                if (pCheck.rows.length === 0) {
                    throw new Error("Product not found");
                }
                dbPrice = parseFloat(pCheck.rows[0].price);
            } else {
                dbPrice = parseFloat(vCheck.rows[0].price);
            }
        } else {
            const pCheck = await client.query("SELECT price FROM products WHERE product_id = $1", [product_id]);
            if (pCheck.rows.length === 0) {
                throw new Error("Product not found");
            }
            dbPrice = parseFloat(pCheck.rows[0].price);
        }

        const cart_id = await getOrCreateCart(client, customer_id);

        // Check if same product+variant already in cart
        const existing = await client.query(
            `SELECT cart_item_id, quantity FROM cart_items 
             WHERE cart_id = $1 AND product_id = $2 AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))`,
            [cart_id, product_id, variant_id || null]
        );

        let targetQuantity = quantity;
        if (existing.rows.length > 0) {
            targetQuantity += existing.rows[0].quantity;
        }

        if (targetQuantity > 100) {
            throw new Error("Quantity in cart cannot exceed 100 units per item.");
        }

        // Fetch stock of product / variant
        let stockQuantity = 0;
        let productName = '';
        if (variant_id) {
            const vStock = await client.query(
                "SELECT pv.stock_quantity, p.name FROM product_variants pv JOIN products p ON pv.product_id = p.product_id WHERE pv.variant_id = $1 AND pv.product_id = $2",
                [variant_id, product_id]
            );
            if (vStock.rows.length > 0) {
                stockQuantity = vStock.rows[0].stock_quantity;
                productName = vStock.rows[0].name;
            }
        } else {
            const pStock = await client.query("SELECT stock_quantity, name FROM products WHERE product_id = $1", [product_id]);
            if (pStock.rows.length > 0) {
                stockQuantity = pStock.rows[0].stock_quantity;
                productName = pStock.rows[0].name;
            }
        }

        if (targetQuantity > stockQuantity) {
            throw new Error(`Only ${stockQuantity} units of '${productName}' are currently in stock.`);
        }

        if (existing.rows.length > 0) {
            // Increment quantity and update price to secure DB price
            await client.query(
                'UPDATE cart_items SET quantity = quantity + $1, price = $2, updated_at = NOW() WHERE cart_item_id = $3',
                [quantity || 1, dbPrice, existing.rows[0].cart_item_id]
            );
        } else {
            // Insert new item with secure DB price
            await client.query(
                `INSERT INTO cart_items (cart_item_id, cart_id, product_id, variant_id, quantity, price)
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
                [cart_id, product_id, variant_id || null, quantity || 1, dbPrice]
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

        // Send cart notification email securely from the backend (fire and forget)
        try {
            const custEmailRes = await pool.query("SELECT email FROM customers WHERE customer_id = $1", [customer_id]);
            if (custEmailRes.rows.length > 0) {
                const customerEmail = custEmailRes.rows[0].email;
                sendCartAddEmail(customerEmail, productName).catch(() => {});
            }
        } catch (emailErr) {
            console.error("[EMAIL ERROR] Failed to query customer email for cart notification:", emailErr.message);
        }

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

        if (req.user.id !== ownershipCheck.rows[0].customer_id && !['admin', 'super_admin'].includes(req.user.type)) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this cart item' });
        }

        const qty = parseInt(quantity);
        if (!isNaN(qty) && qty > 100) {
            return res.status(400).json({ success: false, message: 'Quantity cannot exceed 100 units per item.' });
        }

        let dbPrice = 0;
        if (!isNaN(qty) && qty > 0) {
            // Fetch actual stock and price
            const stockCheck = await client.query(
                `SELECT 
                    ci.product_id, 
                    ci.variant_id,
                    p.name AS product_name,
                    COALESCE(pv.stock_quantity, p.stock_quantity) AS stock_quantity,
                    COALESCE(pv.price, p.price) AS current_price
                 FROM cart_items ci
                 JOIN products p ON ci.product_id = p.product_id
                 LEFT JOIN product_variants pv ON ci.variant_id = pv.variant_id
                 WHERE ci.cart_item_id = $1`,
                [cart_item_id]
            );

            if (stockCheck.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Cart item or associated product not found.' });
            }

            const { stock_quantity, product_name, current_price } = stockCheck.rows[0];
            if (qty > stock_quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Cannot update quantity to ${qty}. Only ${stock_quantity} units of '${product_name}' are currently in stock.` 
                });
            }
            dbPrice = parseFloat(current_price);
        }

        await client.query('BEGIN');

        let result;
        if (quantity <= 0) {
            result = await client.query('DELETE FROM cart_items WHERE cart_item_id = $1 RETURNING cart_id', [cart_item_id]);
        } else {
            // Update quantity and price in cart_items using latest DB price
            result = await client.query(
                'UPDATE cart_items SET quantity = $1, price = $2, updated_at = NOW() WHERE cart_item_id = $3 RETURNING cart_id',
                [quantity, dbPrice, cart_item_id]
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

        if (req.user.id !== ownershipCheck.rows[0].customer_id && !['admin', 'super_admin'].includes(req.user.type)) {
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

    if (req.user.id !== customer_id && !['admin', 'super_admin'].includes(req.user.type)) {
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
