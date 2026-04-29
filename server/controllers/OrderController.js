import { pool } from '../configs/db.js';
import { pushOrderToShiprocket, cancelShipment } from './ShipmentController.js';
import { processAutoPayout } from './PayoutController.js';
import crypto from 'crypto';

export const createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      address_details, // { full_name, phone, address_line_1, city, state, pincode }
      items, // [{ product_id, variant_id, quantity, unit_price, seller_id }]
      payment_method,
      payment_id, // Razorpay payment ID
      razorpay_order_id,
      razorpay_signature,
      subtotal,
      shipping_charges,
      tax_amount,
      total_amount,
      discount_amount = 0,
      coupon_id = null
    } = req.body;

    const customer_id = req.user.id;

    // Security Fix: Razorpay Signature Verification
    if (payment_method === 'online') {
      if (!payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: "Missing payment verification details" });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret || secret === 'your_razorpay_secret_here') {
        console.error("CRITICAL: RAZORPAY_KEY_SECRET NOT CONFIGURED OR USING PLACEHOLDER");
        return res.status(500).json({ success: false, message: "Payment gateway configuration error. Please contact administrator." });
      }

      const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(razorpay_order_id + "|" + payment_id)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Invalid payment signature. Transaction rejected." });
      }
    }

    // Failsafe: Check if user is an admin
    const adminCheck = await pool.query("SELECT admin_id FROM admins WHERE admin_id = $1", [customer_id]);
    if (adminCheck.rows.length > 0) {
      return res.status(403).json({
        success: false,
        message: "Administrators are restricted from placing orders. Please use a customer account."
      });
    }

    await client.query('BEGIN');

    // 1. Get or Create Address ID
    let address_id = address_details.address_id;
    if (!address_id) {
      const addrRes = await client.query(
        `INSERT INTO addresses (address_id, customer_id, full_name, phone, address_line_1, city, state, pincode, is_default)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, false)
         RETURNING address_id`,
        [customer_id, address_details.name, address_details.phone, address_details.address, address_details.city, address_details.state, address_details.pincode]
      );
      address_id = addrRes.rows[0].address_id;
    }

    // 2. Insert into orders
    const payment_status = payment_method === 'cod' ? 'Pending' : 'Paid';

    // Automatic calculation of fees to ensure they are never 0 for new orders
    const subtotal_val = parseFloat(subtotal) || 0;
    const final_platform_fee = parseFloat(req.body.platform_fee) || 10;
    const final_tax_amount = parseFloat(tax_amount) || Math.round(subtotal_val * 0.05);
    const final_cod_fee = parseFloat(req.body.cod_fee) || (payment_method === 'cod' ? 50 : 0);
    const final_shipping = parseFloat(shipping_charges) || 0;

    const orderRes = await client.query(
      `INSERT INTO orders (order_id, customer_id, address_id, subtotal, shipping_charges, tax_amount, total_amount, discount_amount, coupon_id, platform_fee, cod_fee, order_status, payment_status, payment_method)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $10, $11, 'Pending', $9, $12)
       RETURNING order_id`,
      [customer_id, address_id, subtotal_val, final_shipping, final_tax_amount, total_amount, discount_amount, coupon_id, payment_status, final_platform_fee, final_cod_fee, payment_method]
    );
    const order_id = orderRes.rows[0].order_id;

    // Update coupon usage count if applicable (Atomic check and update)
    if (coupon_id && coupon_id !== 'null' && coupon_id !== 'undefined') {
      try {
        const couponCheck = await client.query(
          "SELECT max_usage, used_count FROM coupons WHERE coupon_id = $1 FOR UPDATE",
          [coupon_id]
        );

        if (couponCheck.rows.length > 0) {
          const { max_usage, used_count } = couponCheck.rows[0];
          
          // Check if customer already used this coupon
          const customerUsage = await client.query(
            "SELECT 1 FROM coupon_usage WHERE coupon_id = $1 AND customer_id = $2",
            [coupon_id, customer_id]
          );
          if (customerUsage.rows.length > 0) {
            throw new Error("You have already used this coupon");
          }

          if (max_usage && used_count >= max_usage) {
            throw new Error("Coupon usage limit reached");
          }

          await client.query(
            "UPDATE coupons SET used_count = used_count + 1 WHERE coupon_id = $1",
            [coupon_id]
          );

          await client.query(
            "INSERT INTO coupon_usage (usage_id, coupon_id, customer_id, order_id, used_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW())",
            [coupon_id, customer_id, order_id]
          );
        }
      } catch (couponError) {
        await client.query('ROLLBACK');
        console.error("[ORDER] Coupon Error:", couponError.message);
        return res.status(400).json({ success: false, message: couponError.message || "Failed to process coupon" });
      }
    }

    // 3. Insert into order_items, update stock, and track seller totals
    const commissionRate = 0.10; // Default 10%
    const sellerSubtotals = {};

    for (const item of items) {
      const qty = parseInt(item.quantity) || 1;
      const rawVId = item.variant_id || item.variantId;
      const vId = (rawVId && rawVId !== 'null' && rawVId !== '') ? rawVId : null;

      // ATOMIC STOCK CHECK AND UPDATE
      if (vId) {
        const vCheck = await client.query(
          "SELECT stock_quantity FROM product_variants WHERE variant_id = $1 FOR UPDATE",
          [vId]
        );
        if (vCheck.rows.length === 0 || vCheck.rows[0].stock_quantity < qty) {
          throw new Error(`Insufficient stock for variant ${vId}`);
        }
        await client.query(
          "UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2",
          [qty, vId]
        );
      } else {
        const pCheck = await client.query(
          "SELECT stock_quantity FROM products WHERE product_id = $1 FOR UPDATE",
          [item.product_id]
        );
        if (pCheck.rows.length === 0 || pCheck.rows[0].stock_quantity < qty) {
          throw new Error(`Insufficient stock for product ${item.product_id}`);
        }
        await client.query(
          "UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2",
          [qty, item.product_id]
        );
      }

      const orderItemRes = await client.query(
        `INSERT INTO order_items (order_item_id, order_id, product_id, variant_id, seller_id, quantity, unit_price, total_price, item_status)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'Pending')
         RETURNING order_item_id`,
        [order_id, item.product_id, item.variant_id || null, item.seller_id, item.quantity, item.unit_price, item.unit_price * item.quantity]
      );
      const order_item_id = orderItemRes.rows[0].order_item_id;

      // c. Get Seller ID (Lookup if missing)
      let itemSellerId = item.seller_id;
      if (!itemSellerId || itemSellerId === 'null' || itemSellerId === 'undefined') {
        const prodRes = await client.query("SELECT seller_id FROM products WHERE product_id = $1", [item.product_id]);
        if (prodRes.rows.length > 0) {
          itemSellerId = prodRes.rows[0].seller_id;
        }
      }

      // d. Calculate Commission
      const sale_amount = item.unit_price * item.quantity;
      const commission_amount = sale_amount * commissionRate;
      const seller_earnings = sale_amount - commission_amount;

      await client.query(
        `INSERT INTO seller_commissions (commission_id, order_id, order_item_id, seller_id, sale_amount, commission_rate, commission_amount, seller_earnings, status)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'Pending')`,
        [order_id, order_item_id, itemSellerId, sale_amount, commissionRate, commission_amount, seller_earnings]
      );

      // e. Track seller totals for order_sellers table
      if (itemSellerId) {
        if (!sellerSubtotals[itemSellerId]) {
          sellerSubtotals[itemSellerId] = 0;
        }
        sellerSubtotals[itemSellerId] += sale_amount;
      }
    }

    // 4. Insert into order_sellers and notifications
    for (const seller_id in sellerSubtotals) {
      if (seller_id === 'undefined' || seller_id === 'null') continue; // Extra safety
      await client.query(
        `INSERT INTO order_sellers (order_seller_id, order_id, seller_id, seller_subtotal)
         VALUES (gen_random_uuid(), $1, $2, $3)`,
        [order_id, seller_id, sellerSubtotals[seller_id]]
      );

      // Create notification for the seller
      await client.query(
        `INSERT INTO notifications (notification_id, customer_id, seller_id, order_id, is_read, type, message, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, false, 'new_order', $4, NOW())`,
        [customer_id, seller_id, order_id, `New order received! Order Total: ₹${sellerSubtotals[seller_id]}`]
      );
    }

    // 5. Insert into payments
    const paymentRes = await client.query(
      `INSERT INTO payments (payment_id, customer_id, order_id, amount, payment_method, payment_status, transaction_id, paid_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
       RETURNING payment_id`,
      [customer_id, order_id, total_amount, payment_method, payment_status, payment_id || null, payment_status === 'Paid' ? new Date() : null]
    );
    const internal_payment_id = paymentRes.rows[0].payment_id;

    // 5b. Log into finance_transactions if Paid
    if (payment_status === 'Paid') {
      await client.query(
        `INSERT INTO finance_transactions (finance_transactions_id, order_id, payment_id, transaction_type, amount, created_at)
             VALUES (gen_random_uuid(), $1, $2, 'order_payment', $3, NOW())`,
        [order_id, internal_payment_id, total_amount]
      );
    }

    // 6. Insert into order_status_history
    await client.query(
      `INSERT INTO order_status_history (history_id, order_id, changed_by, status, notes)
         VALUES (gen_random_uuid(), $1, $2, 'Pending', 'Order placed successfully')`,
      [order_id, customer_id]
    );

    // 7. Clear Cart
    const cartRes = await client.query("SELECT cart_id FROM cart WHERE customer_id = $1", [customer_id]);
    if (cartRes.rows.length > 0) {
      const cart_id = cartRes.rows[0].cart_id;
      await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cart_id]);
      await client.query("UPDATE cart SET item_count = 0, total_amount = 0, updated_at = NOW() WHERE cart_id = $1", [cart_id]);
    }

    // 8. Create Order Confirmation Notification for Customer
    await client.query(
      `INSERT INTO notifications (notification_id, customer_id, order_id, is_read, type, message, created_at)
       VALUES (gen_random_uuid(), $1, $2, false, 'order_placed', $3, NOW())`,
      [customer_id, order_id, `Your order #${order_id.slice(0, 8).toUpperCase()} has been placed successfully!`]
    );

    // 8b. Create Global Admin Notification
    await client.query(
      `INSERT INTO notifications (notification_id, type, message, created_at, is_read)
       VALUES (gen_random_uuid(), 'new_order', $1, NOW(), false)`,
      [`New Order #${order_id.slice(0, 8).toUpperCase()} received! Total: ₹${total_amount}`]
    );

    await client.query('COMMIT');


    // 9. Sync with Shiprocket (Background/Non-blocking to prevent UI timeout)
    pushOrderToShiprocket(order_id).catch(srError => {
        console.error(`[SHIPROCKET BACKGROUND ERROR] Order ${order_id}:`, srError.message);
    });


    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order_id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[ORDER FATAL ERROR]`, error);
    res.status(500).json({ success: false, message: error.message || "Failed to place order" });
  } finally {
    client.release();
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const customer_id = req.user.id;
    const result = await pool.query(
      `SELECT o.*, 
             (SELECT json_agg(oi.*) FROM order_items oi WHERE oi.order_id = o.order_id) as items
             FROM orders o 
             WHERE o.customer_id = $1 
             ORDER BY o.placed_at DESC`,
      [customer_id]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("FETCH ORDERS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
}


export const getOrderById = async (req, res) => {
  try {
    const { order_id } = req.params;

    // Fetch order details
    const orderRes = await pool.query(
      `SELECT o.*, a.full_name as shipping_name, a.phone as shipping_phone, a.address_line_1, a.city, a.state, a.pincode
             FROM orders o
             JOIN addresses a ON o.address_id = a.address_id
             WHERE o.order_id = $1`,
      [order_id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderRes.rows[0];

    // Ownership/Role Check
    // Allowed if: User is the customer WHO placed it, OR an Admin, OR a Seller who has items in this order
    let isAuthorized = false;
    if (req.user.type === 'admin') {
      isAuthorized = true;
    } else if (req.user.type === 'customer' && order.customer_id === req.user.id) {
      isAuthorized = true;
    } else if (req.user.type === 'seller') {
      const sellerItemCheck = await pool.query(
        "SELECT 1 FROM order_items WHERE order_id = $1 AND seller_id = $2 LIMIT 1",
        [order_id, req.user.id]
      );
      if (sellerItemCheck.rows.length > 0) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Unauthorized access to order details" });
    }

    // Fetch order items with product details and commission info
    const itemsRes = await pool.query(
      `SELECT oi.*, p.name as product_name, p.slug, p.images, pv.variant_name, pv.variant_value,
                    sc.commission_rate, sc.commission_amount, sc.seller_earnings
             FROM order_items oi
             JOIN products p ON oi.product_id = p.product_id
             LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
             LEFT JOIN seller_commissions sc ON oi.order_item_id = sc.order_item_id
             WHERE oi.order_id = $1`,
      [order_id]
    );

    // Fetch status history
    const historyRes = await pool.query(
      `SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY changed_at DESC`,
      [order_id]
    );

    // Fetch payment details
    const paymentRes = await pool.query(
      `SELECT * FROM payments WHERE order_id = $1`,
      [order_id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...orderRes.rows[0],
        items: itemsRes.rows,
        status_history: historyRes.rows,
        payment: paymentRes.rows[0] || null
      }
    });
  } catch (error) {
    console.error("FETCH ORDER DETAILS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch order details" });
  }


}

export const updateOrderStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { order_id } = req.params;
    const { status, notes, courier, tracking_id, est_delivery } = req.body;
    const changed_by = req.user.id;

    // Ownership/Role Check
    if (req.user.type === 'customer' && status !== 'Cancelled') {
      return res.status(403).json({ success: false, message: "Customers can only cancel their own orders." });
    }

    const orderCheck = await client.query("SELECT customer_id, order_status FROM orders WHERE order_id = $1", [order_id]);
    if (orderCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (req.user.type === 'customer' && orderCheck.rows[0].customer_id !== req.user.id) {
      client.release();
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    if (req.user.type === 'seller') {
      const sellerItemCheck = await client.query(
        "SELECT 1 FROM order_items WHERE order_id = $1 AND seller_id = $2 LIMIT 1",
        [order_id, req.user.id]
      );
      if (sellerItemCheck.rows.length === 0) {
        client.release();
        return res.status(403).json({ success: false, message: "Unauthorized access to this order" });
      }
    }

    await client.query('BEGIN');

    // 1. Update order status and logistics
    await client.query(
      `UPDATE orders 
             SET order_status = $1, 
                 cancellation_reason = $2, 
                 courier = $3, 
                 tracking_id = $4, 
                 estimated_delivery = $5,
                 updated_at = NOW() 
             WHERE order_id = $6`,
      [status, status === 'Cancelled' ? notes : null, courier, tracking_id, est_delivery, order_id]
    );

    // 1b. Sync with deliveries table
    if (status === 'Shipped' || status === 'Delivered' || status === 'Processing') {
      await client.query(`
                INSERT INTO deliveries (
                    delivery_id, order_id, courier_name, awb_code, shipping_status, 
                    dispatched_at, delivered_at, updated_at, created_at
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, $4,
                    CASE WHEN $4 = 'Shipped' OR $4 = 'Delivered' THEN NOW() ELSE NULL END,
                    CASE WHEN $4 = 'Delivered' THEN NOW() ELSE NULL END,
                    NOW(), NOW()
                )
                ON CONFLICT (order_id) DO UPDATE SET
                    courier_name = EXCLUDED.courier_name,
                    awb_code = EXCLUDED.awb_code,
                    shipping_status = EXCLUDED.shipping_status,
                    dispatched_at = COALESCE(deliveries.dispatched_at, EXCLUDED.dispatched_at),
                    delivered_at = COALESCE(deliveries.delivered_at, EXCLUDED.delivered_at),
                    updated_at = NOW()
            `, [order_id, courier || 'Manual', tracking_id || 'N/A', status]);
    }

    // 2. Logistics & Finance sync on delivery
    if (status === 'Delivered') {
      // Mark Customer Payment as Paid
      const payRes = await client.query(
        "UPDATE payments SET payment_status = 'Paid', paid_at = NOW() WHERE order_id = $1 RETURNING payment_id, amount",
        [order_id]
      );

      if (payRes.rows.length > 0) {
        // Log into finance_transactions
        await client.query(
          `INSERT INTO finance_transactions (finance_transactions_id, order_id, payment_id, transaction_type, amount, created_at)
                     VALUES (gen_random_uuid(), $1, $2, 'order_payment', $3, NOW())`,
          [order_id, payRes.rows[0].payment_id, payRes.rows[0].amount]
        );

        // Update order payment status
        await client.query("UPDATE orders SET payment_status = 'Paid' WHERE order_id = $1", [order_id]);
      }
    } else if (status === 'Cancelled') {
      await client.query(
        "UPDATE seller_commissions SET status = 'Cancelled' WHERE order_id = $1",
        [order_id]
      );

      // Restore Stock
      const orderItems = await client.query("SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = $1", [order_id]);
      for (const item of orderItems.rows) {
        if (item.variant_id) {
          await client.query("UPDATE product_variants SET stock_quantity = stock_quantity + $1 WHERE variant_id = $2", [item.quantity, item.variant_id]);
        } else {
          await client.query("UPDATE products SET stock_quantity = stock_quantity + $1 WHERE product_id = $2", [item.quantity, item.product_id]);
        }
      }

      // Update daily_finances to subtract revenue
      const orderInfo = await client.query("SELECT DATE(placed_at) as date FROM orders WHERE order_id = $1", [order_id]);
      if (orderInfo.rows.length > 0) {
        const sellerSubtotals = await client.query("SELECT seller_id, seller_subtotal FROM order_sellers WHERE order_id = $1", [order_id]);
        for (const s of sellerSubtotals.rows) {
          await client.query(`
                        UPDATE daily_finances 
                        SET total_revenue = total_revenue - $1, 
                            platform_commission = platform_commission - ($1 * 0.1), 
                            net_seller_earnings = net_seller_earnings - ($1 * 0.9)
                        WHERE seller_id = $2 AND date = $3
                    `, [s.seller_subtotal, s.seller_id, orderInfo.rows[0].date]);
        }
      }
    }

    // 3. Handle Shiprocket Cancellation if applicable
    if (status === 'Cancelled') {
      await cancelShipment(order_id);
    }

    // 4. Add to history
    await client.query(
      "INSERT INTO order_status_history (history_id, order_id, changed_by, status, notes) VALUES (gen_random_uuid(), $1, $2, $3, $4)",
      [order_id, changed_by, status, notes || `Order status updated to ${status}`]
    );

    // 5. Create Notification for Customer
    const customerIdRes = await client.query("SELECT customer_id FROM orders WHERE order_id = $1", [order_id]);
    if (customerIdRes.rows.length > 0) {
      const customer_id = customerIdRes.rows[0].customer_id;
      await client.query(
        `INSERT INTO notifications (notification_id, customer_id, order_id, is_read, type, message, created_at)
                 VALUES (gen_random_uuid(), $1, $2, false, 'status_update', $3, NOW())`,
        [customer_id, order_id, `Your order #${order_id.slice(0, 8).toUpperCase()} status has been updated to: ${status}`]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("UPDATE ORDER STATUS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to update order status" });
  } finally {

    client.release();
  }
};

/**
 * Create a Return Request (Customer Side)
 */
export const createReturnRequest = async (req, res) => {
    const client = await pool.connect();
    try {
        const { order_id, order_item_id, reason, return_type } = req.body;
        const customer_id = req.user.id;

        if (!order_id || !order_item_id || !customer_id || !reason || !return_type) {
            return res.status(400).json({ success: false, message: "Missing required fields for return request." });
        }

        await client.query('BEGIN');

        // 1. Verify the order belongs to the customer and is delivered
        const orderCheck = await client.query(
            "SELECT order_status FROM orders WHERE order_id = $1 AND customer_id = $2",
            [order_id, customer_id]
        );

        if (orderCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Order not found or does not belong to you." });
        }

        if (orderCheck.rows[0].order_status !== 'Delivered') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: "Only delivered orders can be returned." });
        }

        // 2. Verify the order item exists
        const itemCheck = await client.query(
            "SELECT unit_price, quantity FROM order_items WHERE order_item_id = $1 AND order_id = $2",
            [order_item_id, order_id]
        );

        if (itemCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Order item not found." });
        }

        const { unit_price, quantity } = itemCheck.rows[0];
        const refund_amount = unit_price * quantity;

        // 3. Insert into return_requests
        const returnRes = await client.query(
            `INSERT INTO return_requests (
                return_request_id, order_id, order_item_id, customer_id, 
                reason, return_type, refund_amount, refund_status, requested_at
            ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'Pending', NOW())
            RETURNING return_request_id`,
            [order_id, order_item_id, customer_id, reason, return_type, refund_amount]
        );
        const return_request_id = returnRes.rows[0].return_request_id;

        // 4. Create notification for admin
        await client.query(
            `INSERT INTO notifications (notification_id, type, message, created_at, is_read)
             VALUES (gen_random_uuid(), 'return_request', $1, NOW(), false)`,
            [`New Return Request #${return_request_id.slice(0, 8).toUpperCase()} received for Order #${order_id.slice(0, 8).toUpperCase()}`]
        );

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: "Return request submitted successfully.", return_id: return_request_id });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("CREATE RETURN REQUEST ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to submit return request." });
    } finally {

        client.release();
    }
};



