import { pool } from '../configs/db.js';
import { pushOrderToShiprocket, cancelShipment } from './ShipmentController.js';
import { sendOrderStatusNotifications } from '../utils/notifications.js';
import { sendOrderConfirmationEmail } from '../utils/email.js';
import { processAutoPayout } from './PayoutController.js';
import crypto from 'crypto';
import { verifySignature, initiateRefund, createRazorpayOrderInstance, autoRefundOrphanedPayment } from '../services/paymentService.js';
import { sanitizeText } from '../utils/sanitizer.js';

export const createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      address_details, // { full_name, phone, address_line_1, city, state, pincode }
      items, // [{ product_id, variant_id, quantity, seller_id }]
      payment_method,
      payment_id, // Razorpay payment ID
      razorpay_order_id,
      razorpay_signature,
      discount_amount = 0,
      coupon_id = null
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart cannot be empty. Please add items to your cart." });
    }

    if (items.length > 50) {
      return res.status(400).json({ success: false, message: "Order exceeds maximum limit of 50 distinct items. Please split your order." });
    }

    const customer_id = req.user.id;

    // Security Fix: Razorpay Signature Verification
    if (payment_method === 'online' || payment_method === 'razorpay') {
      if (!payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: "Missing payment verification details" });
      }

      try {
        const isValid = verifySignature(razorpay_order_id, payment_id, razorpay_signature);
        if (!isValid) {
          return res.status(400).json({ success: false, message: "Invalid payment signature. Transaction rejected." });
        }
      } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
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

    if (!address_details) {
      return res.status(400).json({ success: false, message: "Delivery address details are required." });
    }

    let address_id = address_details.address_id;
    let sanitizedAddressDetails = {};

    if (!address_id) {
      const { name, phone, address, city, state, pincode } = address_details;

      if (!name || !phone || !address || !city || !state || !pincode) {
        return res.status(400).json({
          success: false,
          message: "All address fields (name, phone, address, city, state, pincode) are required for delivery."
        });
      }

      // Validate phone is exactly 10-15 digits
      const cleanedPhone = phone.replace(/\D/g, '');
      if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
        return res.status(400).json({ success: false, message: "Please provide a valid phone number (10 to 15 digits)." });
      }

      // Validate pincode is a valid format (6 digits)
      const cleanedPincode = pincode.replace(/\s/g, '');
      if (!/^\d{6}$/.test(cleanedPincode)) {
        return res.status(400).json({ success: false, message: "Please provide a valid 6-digit PIN code." });
      }

      // Sanitize fields to prevent XSS
      sanitizedAddressDetails = {
        name: sanitizeText(name),
        phone: cleanedPhone,
        address: sanitizeText(address),
        city: sanitizeText(city),
        state: sanitizeText(state),
        pincode: cleanedPincode
      };

      if (!sanitizedAddressDetails.name || !sanitizedAddressDetails.address || !sanitizedAddressDetails.city || !sanitizedAddressDetails.state) {
        return res.status(400).json({ success: false, message: "Invalid or unsafe characters detected in the delivery address." });
      }
    }

    await client.query('BEGIN');

    // 1. Get or Create Address ID (Pattern from Gift Ecommerce)
    if (!address_id) {
        const addrRes = await client.query(
            `INSERT INTO addresses (address_id, customer_id, full_name, phone, address_line_1, city, state, pincode, is_default)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, false)
             RETURNING address_id`,
            [customer_id, sanitizedAddressDetails.name, sanitizedAddressDetails.phone, sanitizedAddressDetails.address, sanitizedAddressDetails.city, sanitizedAddressDetails.state, sanitizedAddressDetails.pincode]
        );
        address_id = addrRes.rows[0].address_id;
    }

    // 2. Fetch platform fees from admin_settings (Pattern from Gift Ecommerce)
    let customerPlatformFee = 10.00;
    let sellerPlatformFee = 15.00;
    try {
        const settingsRes = await client.query(
            "SELECT key, value FROM admin_settings WHERE key IN ('customer_platform_fee', 'seller_platform_fee')"
        );
        for (const row of settingsRes.rows) {
            const val = typeof row.value === 'object' && row.value !== null ? parseFloat(row.value.fee || row.value) : parseFloat(JSON.parse(row.value));
            if (!isNaN(val) && val >= 0) {
                if (row.key === 'customer_platform_fee') customerPlatformFee = val;
                if (row.key === 'seller_platform_fee') sellerPlatformFee = val;
            }
        }
    } catch (err) {
        console.warn("[SETTINGS] Using default platform fees:", err.message);
    }

    // 1. Get or Create Address ID
    if (!address_id) {
      const addrRes = await client.query(
        `INSERT INTO addresses (address_id, customer_id, full_name, phone, address_line_1, city, state, pincode, is_default)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, false)
         RETURNING address_id`,
        [
          customer_id,
          sanitizedAddressDetails.name,
          sanitizedAddressDetails.phone,
          sanitizedAddressDetails.address,
          sanitizedAddressDetails.city,
          sanitizedAddressDetails.state,
          sanitizedAddressDetails.pincode
        ]
      );
      address_id = addrRes.rows[0].address_id;
    }

    // 2. Initial order values (will be updated after item loop)
    const order_id = crypto.randomUUID();
    const payment_status = payment_method === 'cod' ? 'Pending' : 'Paid';

    // 3. Process items and calculate totals (Security Fix: Server-side price validation)
    let serverCalculatedSubtotal = 0;
    const sellerSubtotals = {};
    const processedItems = [];

    // Fetch global default commission rate from system_config (with 10% default fallback)
    let globalCommissionRate = 0.10;
    try {
      // Use pool.query instead of client.query so failure won't abort the active transaction
      const configRes = await pool.query("SELECT value FROM system_config WHERE key = 'commission_rate'");
      if (configRes.rows.length > 0) {
        globalCommissionRate = parseFloat(configRes.rows[0].value);
      }
    } catch (err) {
      console.warn("Failed to fetch global commission_rate, falling back to 0.10:", err.message);
    }

    const sellerCommissionRates = {};

    for (const item of items) {
      const qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) throw new Error(`Invalid quantity for one or more items.`);

      const rawVId = item.variant_id || item.variantId;
      const vId = (rawVId && rawVId !== 'null' && rawVId !== '') ? rawVId : null;

      let dbPrice = 0;
      let dbSellerId = null;

      if (vId) {
        const vCheck = await client.query(
          "SELECT pv.price, p.seller_id, pv.stock_quantity FROM product_variants pv JOIN products p ON pv.product_id = p.product_id WHERE pv.variant_id = $1 FOR UPDATE",
          [vId]
        );
        if (vCheck.rows.length === 0) throw new Error(`Insufficient stock or invalid product variant.`);
        if (vCheck.rows[0].stock_quantity < qty) throw new Error(`Insufficient stock for one or more items.`);

        dbPrice = parseFloat(vCheck.rows[0].price);
        dbSellerId = vCheck.rows[0].seller_id;

        const updateRes = await client.query("UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2 AND stock_quantity >= $1", [qty, vId]);
        if (updateRes.rowCount === 0) throw new Error(`Insufficient stock for one or more items.`);
      } else {
        const pCheck = await client.query(
          "SELECT price, seller_id, stock_quantity FROM products WHERE product_id = $1 FOR UPDATE",
          [item.product_id]
        );
        if (pCheck.rows.length === 0) throw new Error(`Insufficient stock or invalid product.`);
        if (pCheck.rows[0].stock_quantity < qty) throw new Error(`Insufficient stock for one or more items.`);

        dbPrice = parseFloat(pCheck.rows[0].price);
        dbSellerId = pCheck.rows[0].seller_id;

        const updateRes = await client.query("UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2 AND stock_quantity >= $1", [qty, item.product_id]);
        if (updateRes.rowCount === 0) throw new Error(`Insufficient stock for one or more items.`);
      }

      const itemTotal = dbPrice * qty;
      serverCalculatedSubtotal += itemTotal;

      let currentCommissionRate = globalCommissionRate;
      if (dbSellerId) {
        if (sellerCommissionRates[dbSellerId] !== undefined) {
          currentCommissionRate = sellerCommissionRates[dbSellerId];
        } else {
          try {
            const sellerRes = await client.query("SELECT commission_rate FROM sellers WHERE seller_id = $1", [dbSellerId]);
            if (sellerRes.rows.length > 0 && sellerRes.rows[0].commission_rate !== null) {
              currentCommissionRate = parseFloat(sellerRes.rows[0].commission_rate);
            }
          } catch (err) {
            console.warn(`Failed to fetch custom commission_rate for seller ${dbSellerId}:`, err.message);
          }
          sellerCommissionRates[dbSellerId] = currentCommissionRate;
        }
      }

      if (dbSellerId) {
        sellerSubtotals[dbSellerId] = (sellerSubtotals[dbSellerId] || 0) + itemTotal;
      }

      processedItems.push({
        product_id: item.product_id,
        variant_id: vId,
        seller_id: dbSellerId,
        quantity: qty,
        unit_price: dbPrice,
        total_price: itemTotal,
        commission_rate: currentCommissionRate
      });
    }

    // 4. Validate Coupon and Calculate Discount
    let serverDiscountAmount = 0;
    let validatedCouponId = null;
    if (coupon_id && coupon_id !== 'null' && coupon_id !== 'undefined') {
      const couponCheck = await client.query(
        "SELECT type, discount_percent, discount_amount, max_discount, min_order_value, max_usage, used_count FROM coupons WHERE coupon_id = $1 AND is_active = true AND (valid_until IS NULL OR valid_until > NOW()) FOR UPDATE",
        [coupon_id]
      );

      if (couponCheck.rows.length > 0) {
        validatedCouponId = coupon_id;
        const coupon = couponCheck.rows[0];

        if (serverCalculatedSubtotal < parseFloat(coupon.min_order_value || 0)) {
          throw new Error(`Minimum order value for this coupon is ₹${coupon.min_order_value}`);
        }

        const customerUsage = await client.query(
          "SELECT 1 FROM coupon_usage WHERE coupon_id = $1 AND customer_id = $2",
          [coupon_id, customer_id]
        );
        if (customerUsage.rows.length > 0) throw new Error("Coupon already used.");
        if (coupon.max_usage && coupon.used_count >= coupon.max_usage) throw new Error("Coupon expired.");

        if (coupon.type === 'percentage') {
          serverDiscountAmount = (serverCalculatedSubtotal * parseFloat(coupon.discount_percent)) / 100;
          if (coupon.max_discount) {
            serverDiscountAmount = Math.min(serverDiscountAmount, parseFloat(coupon.max_discount));
          }
        } else {
          // Fixed discount from database
          serverDiscountAmount = parseFloat(coupon.discount_amount || 0);
        }

        await client.query("UPDATE coupons SET used_count = used_count + 1 WHERE coupon_id = $1", [coupon_id]);
        await client.query(
          "INSERT INTO coupon_usage (usage_id, coupon_id, customer_id, order_id, used_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW())",
          [coupon_id, customer_id, order_id]
        );
      }
    }

    // Cap the coupon discount to the subtotal to prevent negative cart total calculations
    serverDiscountAmount = Math.min(serverDiscountAmount, serverCalculatedSubtotal);

    // 5. Final Order Calculations
    const final_tax_amount = Math.round(serverCalculatedSubtotal * 0.05); // 5% Tax
    const final_platform_fee = customerPlatformFee;
    const final_cod_fee = payment_method === 'cod' ? 50 : 0;
    const final_shipping = serverCalculatedSubtotal > 5000 ? 0 : 150;
    const final_total_amount = Math.max(0, serverCalculatedSubtotal + final_shipping + final_tax_amount + final_platform_fee + final_cod_fee - serverDiscountAmount);

    // 6. Insert into orders
    await client.query(
      `INSERT INTO orders (
        order_id, customer_id, address_id, subtotal, shipping_charges, 
        tax_amount, total_amount, discount_amount, coupon_id, platform_fee, 
        cod_fee, order_status, payment_status, payment_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Pending', $12, $13)`,
      [
        order_id, customer_id, address_id, serverCalculatedSubtotal, final_shipping,
        final_tax_amount, final_total_amount, serverDiscountAmount, validatedCouponId, final_platform_fee,
        final_cod_fee, payment_status, payment_method
      ]
    );

    // 7. Insert processed items and commissions
    for (const item of processedItems) {
      const orderItemRes = await client.query(
        `INSERT INTO order_items (order_item_id, order_id, product_id, variant_id, seller_id, quantity, unit_price, total_price, item_status)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'Pending')
         RETURNING order_item_id`,
        [order_id, item.product_id, item.variant_id, item.seller_id, item.quantity, item.unit_price, item.total_price]
      );
      const order_item_id = orderItemRes.rows[0].order_item_id;

      const sale_amount = item.total_price;
      const commission_rate = item.commission_rate;
      const commission_amount = sale_amount * commission_rate;
      const seller_earnings = sale_amount - commission_amount;

      await client.query(
        `INSERT INTO seller_commissions (commission_id, order_id, order_item_id, seller_id, sale_amount, commission_rate, commission_amount, seller_earnings, status)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'Pending')`,
        [order_id, order_item_id, item.seller_id, sale_amount, commission_rate, commission_amount, seller_earnings]
      );
    }

    // 8. Insert into order_sellers and notifications
    for (const seller_id in sellerSubtotals) {
      await client.query(
        `INSERT INTO order_sellers (order_seller_id, order_id, seller_id, seller_subtotal)
         VALUES (gen_random_uuid(), $1, $2, $3)`,
        [order_id, seller_id, sellerSubtotals[seller_id]]
      );

      await client.query(
        `INSERT INTO notifications (notification_id, customer_id, seller_id, order_id, is_read, type, message, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, false, 'new_order', $4, NOW())`,
        [customer_id, seller_id, order_id, `New order received! Order Total: ₹${sellerSubtotals[seller_id]}`]
      );
    }

    // 9. Payment records
    const paymentRes = await client.query(
      `INSERT INTO payments (payment_id, customer_id, order_id, amount, payment_method, payment_status, transaction_id, paid_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
       RETURNING payment_id`,
      [customer_id, order_id, final_total_amount, payment_method, payment_status, payment_id || null, payment_status === 'Paid' ? new Date() : null]
    );
    const internal_payment_id = paymentRes.rows[0].payment_id;

    if (payment_status === 'Paid') {
      await client.query(
        `INSERT INTO finance_transactions (finance_transactions_id, order_id, payment_id, transaction_type, amount, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'order_payment', $3, NOW())`,
        [order_id, internal_payment_id, final_total_amount]
      );
    }

    await client.query(
      `INSERT INTO order_status_history (history_id, order_id, changed_by, status, notes)
       VALUES (gen_random_uuid(), $1, $2, 'Pending', 'Order placed successfully')`,
      [order_id, customer_id]
    );

    // 10. Cleanup Cart
    const cartRes = await client.query("SELECT cart_id FROM cart WHERE customer_id = $1", [customer_id]);
    if (cartRes.rows.length > 0) {
      const cart_id = cartRes.rows[0].cart_id;
      await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cart_id]);
      await client.query("UPDATE cart SET item_count = 0, total_amount = 0, updated_at = NOW() WHERE cart_id = $1", [cart_id]);
    }

    await client.query(
      `INSERT INTO notifications (notification_id, customer_id, order_id, is_read, type, message, created_at)
       VALUES (gen_random_uuid(), $1, $2, false, 'order_placed', $3, NOW())`,
      [customer_id, order_id, `Your order #${order_id.slice(0, 8).toUpperCase()} has been placed successfully!`]
    );

    // Note: Global admin notifications without a specific admin_id are disabled to prevent dead data accumulation.
    // Admin dashboard should fetch active orders directly from the orders table.

    await client.query('COMMIT');

    pushOrderToShiprocket(order_id).catch(srError => {
      console.error(`[SHIPROCKET BACKGROUND ERROR] Order ${order_id}:`, srError.message);
    });

    // Send order confirmation email securely from the backend (fire and forget)
    try {
      const custRes = await pool.query("SELECT email, full_name FROM customers WHERE customer_id = $1", [customer_id]);
      if (custRes.rows.length > 0) {
        const customerEmail = custRes.rows[0].email;
        const customerName = custRes.rows[0].full_name;
        sendOrderConfirmationEmail(customerEmail, {
          orderId: order_id,
          totalAmount: final_total_amount,
          paymentMethod: payment_method,
          customerName: customerName
        }).catch(() => { });
      }
    } catch (emailErr) {
      console.error("[EMAIL ERROR] Failed to send order confirmation email:", emailErr.message);
    }

    res.status(201).json({ success: true, message: "Order placed successfully", order_id });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(`[ORDER FATAL ERROR]`, error);

    // Transaction Safety: Auto-Refund Orphaned Payments (Pattern from Gift Ecommerce)
    const { payment_method, payment_id, razorpay_order_id, total_amount } = req.body;
    if ((payment_method === 'online' || payment_method === 'razorpay') && payment_id) {
        autoRefundOrphanedPayment(payment_id, razorpay_order_id, total_amount);
    }

    // Security Fix: Mask raw technical errors but allow through known business errors
    const businessErrors = ["Insufficient stock", "Minimum order value", "Coupon already used", "Coupon expired", "Invalid payment signature", "Administrators are restricted", "Invalid quantity", "Product not found"];
    const isBusinessError = businessErrors.some(msg => error.message?.includes(msg));
    const userMessage = isBusinessError ? error.message : "Failed to place order. Please try again later.";
    res.status(isBusinessError ? 400 : 500).json({ success: false, message: userMessage });
  } finally {
    client.release();
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const { customer_id: paramId } = req.params;
    const isRestricted = req.user.type === 'customer';
    const customer_id = isRestricted ? req.user.id : (paramId || req.user.id);

    const result = await pool.query(
      `SELECT o.*, 
             (SELECT json_agg(json_build_object(
                'order_item_id', oi.order_item_id,
                'product_id', oi.product_id,
                'variant_id', oi.variant_id,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'total_price', oi.total_price,
                'item_status', oi.item_status
              )) FROM order_items oi WHERE oi.order_id = o.order_id) as items
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
    if (req.user.type === 'admin' || req.user.type === 'super_admin') {
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

    // Fetch order items with product details, commission info (admins only), and return details
    const isAdmin = req.user.type === 'admin' || req.user.type === 'super_admin';
    const itemsRes = await pool.query(
      `SELECT oi.*, p.name as product_name, p.slug, p.images, pv.variant_name, pv.variant_value,
                    ${isAdmin ? 'sc.commission_rate, sc.commission_amount, sc.seller_earnings,' : ''}
                    rr.return_request_id, rr.reason as return_reason, rr.return_type, rr.refund_amount as return_refund_amount,
                    rr.refund_status as return_refund_status, rr.resolution_note as return_resolution_note,
                    rs.reverse_awb_code, rs.status as reverse_shipment_status
             FROM order_items oi
             JOIN products p ON oi.product_id = p.product_id
             LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
             LEFT JOIN seller_commissions sc ON oi.order_item_id = sc.order_item_id
             LEFT JOIN return_requests rr ON oi.order_item_id = rr.order_item_id
             LEFT JOIN reverse_shipments rs ON rr.return_request_id = rs.return_request_id
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

    const order = orderCheck.rows[0];

    if (req.user.type === 'customer' && order.customer_id !== req.user.id) {
      client.release();
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    // State-machine Guard: Customers can only cancel orders in 'Pending' or 'Processing' status
    if (req.user.type === 'customer' && status === 'Cancelled') {
      const allowedCancellationStatuses = ['Pending', 'Processing'];
      if (!allowedCancellationStatuses.includes(order.order_status)) {
        client.release();
        return res.status(400).json({
          success: false,
          message: `Cannot cancel an order that is already ${order.order_status}`
        });
      }
    }

    if (req.user.type === 'seller') {
      const sellerAllowedStatuses = ['Processing', 'Shipped', 'Cancelled'];
      if (!sellerAllowedStatuses.includes(status)) {
        client.release();
        return res.status(403).json({ success: false, message: "Sellers are only permitted to update status to Processing, Shipped, or Cancelled." });
      }

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

    // 1b. Sync with order_items table (unless item is already returned or returning)
    await client.query(
      `UPDATE order_items 
       SET item_status = $1 
       WHERE order_id = $2 AND item_status NOT LIKE 'Return%'`,
      [status, order_id]
    );

    // 1c. Sync with deliveries table
    if (status === 'Shipped' || status === 'Delivered' || status === 'Processing') {
      await client.query(`
                INSERT INTO deliveries (
                    delivery_id, order_id, courier_name, awb_code, shipping_status, 
                    dispatched_at, delivered_at, updated_at, created_at
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, $4::varchar,
                    CASE WHEN $4::varchar = 'Shipped' OR $4::varchar = 'Delivered' THEN NOW() ELSE NULL END,
                    CASE WHEN $4::varchar = 'Delivered' THEN NOW() ELSE NULL END,
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
        // [FIX] Duplicate Transaction Guard: Only log 'order_payment' for COD on delivery. 
        // Online payments are already logged at creation (createOrder step 5b).
        const orderInfo = await client.query('SELECT payment_method FROM orders WHERE order_id = $1', [order_id]);

        if (orderInfo.rows[0]?.payment_method === 'cod') {
          await client.query(
            `INSERT INTO finance_transactions (finance_transactions_id, order_id, payment_id, transaction_type, amount, created_at)
                       VALUES (gen_random_uuid(), $1, $2, 'order_payment', $3, NOW())`,
            [order_id, payRes.rows[0].payment_id, payRes.rows[0].amount]
          );
        }

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

      // Handle Refund if Paid online
      const paymentInfo = await client.query(
        "SELECT transaction_id, amount, payment_status, payment_method FROM payments WHERE order_id = $1",
        [order_id]
      );

      if (paymentInfo.rows.length > 0) {
        const p = paymentInfo.rows[0];
        if (p.payment_status === 'Paid' && (p.payment_method === 'online' || p.payment_method === 'razorpay')) {
          console.log(`[PAYMENT] Initiating automated refund for order ${order_id}...`);
          const refundRes = await initiateRefund(p.transaction_id, p.amount, `Order ${order_id} Cancelled`);
          if (refundRes.success) {
            await client.query(
              "UPDATE payments SET payment_status = 'Refunded', updated_at = NOW() WHERE order_id = $1",
              [order_id]
            );
            await client.query(
              `INSERT INTO finance_transactions (finance_transactions_id, order_id, transaction_type, amount, created_at, notes)
                     VALUES (gen_random_uuid(), $1, 'refund', $2, NOW(), $3)`,
              [order_id, p.amount, `Refund ID: ${refundRes.refund_id}`]
            );
          } else {
            console.error(`[REFUND FAILED] Order ${order_id}:`, refundRes.message);
          }
        } else {
          // Just update status to Cancelled for COD
          await client.query(
            "UPDATE payments SET payment_status = 'Cancelled', updated_at = NOW() WHERE order_id = $1",
            [order_id]
          );
        }
      }
    }

    // 4. Add to history
    await client.query(
      "INSERT INTO order_status_history (history_id, order_id, changed_by, status, notes) VALUES (gen_random_uuid(), $1, $2, $3, $4)",
      [order_id, changed_by, status, notes || `Order status updated to ${status}`]
    );

    // 5. Create Notifications (Customer, Sellers, and Admin)
    await sendOrderStatusNotifications(order_id, status, client, courier, tracking_id);

    await client.query('COMMIT');

    // 3. Handle Shiprocket Cancellation if applicable (Moved outside transaction)
    if (status === 'Cancelled') {
      try {
        await cancelShipment(order_id);
      } catch (srErr) {
        console.error(`[SHIPROCKET CANCEL ERROR] Order ${order_id}:`, srErr.message);
      }
    }

    res.status(200).json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
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

    // Whitelist return_type strictly to ['Refund', 'Replacement']
    const allowedReturnTypes = ['Refund', 'Replacement'];
    if (!allowedReturnTypes.includes(return_type)) {
      return res.status(400).json({ success: false, message: "Invalid return type. Must be Refund or Replacement." });
    }

    // Sanitize user-provided reason to prevent stored XSS
    const sanitizedReason = sanitizeText(reason);

    await client.query('BEGIN');

    // Check if return request already exists
    const existingReturn = await client.query(
      "SELECT 1 FROM return_requests WHERE order_item_id = $1",
      [order_item_id]
    );
    if (existingReturn.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: "Return request has already been submitted for this item." });
    }

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

    // 3. Insert into return_requests with sanitized reason
    const returnRes = await client.query(
      `INSERT INTO return_requests (
                return_request_id, order_id, order_item_id, customer_id, 
                reason, return_type, refund_amount, refund_status, requested_at
            ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'Pending', NOW())
            RETURNING return_request_id`,
      [order_id, order_item_id, customer_id, sanitizedReason, return_type, refund_amount]
    );
    const return_request_id = returnRes.rows[0].return_request_id;

    // 3b. Update order_items SET item_status = 'Return Pending'
    await client.query(
      "UPDATE order_items SET item_status = 'Return Pending' WHERE order_item_id = $1",
      [order_item_id]
    );

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

/**
 * Create a server-side Razorpay order before the client opens the payment modal.
 * This gives us a valid order_id that Razorpay will include in its callback,
 * allowing the backend to verify the HMAC signature on createOrder.
 * POST /orders/razorpay/create-order
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'A valid positive amount is required.' });
    }

    const result = await createRazorpayOrderInstance(amount, currency);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[RAZORPAY ORDER CREATION ERROR]', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to initiate payment. Please try again.' });
  }
};
