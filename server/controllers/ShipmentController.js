import { pool } from '../configs/db.js';
import { 
    createShiprocketOrder, 
    getShiprocketTracking, 
    cancelShiprocketOrder,
    getShiprocketServiceability,
    assignShiprocketAWB,
    generateShiprocketPickup,
    createShiprocketReturn as srCreateReturn,
    getShiprocketPickupLocations,
    addShiprocketPickupLocation
} from '../utils/shiprocket.js';

export const createShiprocketReturn = async (payload) => {
    return await srCreateReturn(payload);
};
import { sendOrderStatusNotifications } from '../utils/notifications.js';

/**
 * Intelligent Auto-Pilot: Create SR Order -> Choose Best Courier -> Assign AWB -> Schedule Pickup
 * @param {string} orderId 
 * @param {object} client - Optional DB client for transaction
 */
export const pushOrderToShiprocket = async (orderId, client = pool) => {
    try {
        console.log(`\n[SHIPROCKET] === STARTING DISPATCH FOR ORDER: ${orderId} ===`);
        
        // 1. Fetch Order Details with Customer Address
        const orderRes = await client.query(`
            SELECT o.*, a.full_name, a.phone, a.address_line_1, a.city, a.state, a.pincode, c.email
            FROM orders o
            JOIN addresses a ON o.address_id = a.address_id
            JOIN customers c ON o.customer_id = c.customer_id
            WHERE o.order_id = $1
        `, [orderId]);

        if (orderRes.rows.length === 0) {
            console.error(`[SHIPROCKET] Error: Order ${orderId} not found in DB.`);
            return;
        }

        const order = orderRes.rows[0];

        // 2. Fetch Order Items with Product Weight/Dimensions
        const itemsRes = await client.query(`
            SELECT oi.*, p.name as product_name, p.sku, p.weight, p.length, p.breadth, p.height
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = $1
        `, [orderId]);

        const items = itemsRes.rows;
        if (items.length === 0) {
            console.error(`[SHIPROCKET] Error: No items found for order ${orderId}.`);
            return;
        }

        // 3. Get Default Pickup Location for the primary seller
        const firstSellerId = items[0].seller_id;
        const pickupRes = await client.query(`
            SELECT * FROM seller_pickup_location 
            WHERE seller_id = $1 AND is_default = true
            LIMIT 1
        `, [firstSellerId]);

        if (pickupRes.rows.length === 0) {
            console.warn(`[SHIPROCKET] Warning: Seller ${firstSellerId} has no default pickup location.`);
            return;
        }

        const pickupLocation = pickupRes.rows[0];
        console.log(`[SHIPROCKET] Pickup location: ${pickupLocation.location_name}`);

        // 4. Prepare Shiprocket Payload
        const nameParts = (order.full_name || "Customer").trim().split(/\s+/);
        const firstName = nameParts[0] || "Customer";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";
        let cleanedPhone = order.phone ? order.phone.replace(/\D/g, '') : '';
        if (cleanedPhone.length > 10 && cleanedPhone.startsWith('91')) {
            cleanedPhone = cleanedPhone.substring(cleanedPhone.length - 10);
        }
        const validPhone = cleanedPhone.length >= 10 ? cleanedPhone.substring(0, 10) : "9876543210";
        
        const srOrderItems = items.map(item => ({
            name: item.product_name,
            sku: item.sku || (item.product_id ? item.product_id.slice(0, 8) : "PROD"),
            units: item.quantity,
            selling_price: Number(item.unit_price)
        }));

        const additionalFees = Number(order.tax_amount || 0) + Number(order.platform_fee || 0) + Number(order.cod_fee || 0);
        if (additionalFees > 0) {
            srOrderItems.push({
                name: "Taxes & Platform Fees",
                sku: "TAX-FEE",
                units: 1,
                selling_price: additionalFees
            });
        }

        const srPayload = {
            order_id: order.order_id.toString().slice(0, 20),
            order_date: new Date(order.placed_at).toISOString().split('T')[0],
            pickup_location: pickupLocation.location_name,
            billing_customer_name: firstName,
            billing_last_name: lastName,
            billing_address: order.address_line_1,
            billing_city: order.city,
            billing_pincode: order.pincode,
            billing_state: order.state,
            billing_country: "India",
            billing_email: order.email,
            billing_phone: validPhone,
            shipping_is_billing: true,
            order_items: srOrderItems,
            payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
            sub_total: Number(order.subtotal) + additionalFees,
            shipping_charges: Number(order.shipping_charges || 0),
            total_discount: Number(order.discount_amount || 0),
            length: Math.max(...items.map(i => Number(i.length) || 10)),
            breadth: Math.max(...items.map(i => Number(i.breadth) || 10)),
            height: Math.max(...items.map(i => Number(i.height) || 10)),
            weight: items.reduce((acc, i) => acc + (Number(i.weight) || 0.5) * i.quantity, 0)
        };

        // 5. STEP 1: Create Order in Shiprocket
        console.log(`[SHIPROCKET] Calling createShiprocketOrder...`);
        let srOrderRes = await createShiprocketOrder(srPayload);

        // [FIX] Auto-Sync: If pickup location is missing, register it and retry
        if (srOrderRes && srOrderRes.message && srOrderRes.message.toLowerCase().includes('pickup location')) {
            console.log(`[SHIPROCKET AUTO-SYNC] Detected pickup location error for "${pickupLocation.location_name}".`);
            
            try {
                const syncRes = await addShiprocketPickupLocation(pickupLocation);
                console.log(`[SHIPROCKET AUTO-SYNC] Registration response:`, JSON.stringify(syncRes));

                if (syncRes && (syncRes.success || syncRes.status_code === 200)) {
                    console.log(`[SHIPROCKET AUTO-SYNC] Successfully registered ${pickupLocation.location_name}. Waiting 1.5s for propagation...`);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    console.log(`[SHIPROCKET AUTO-SYNC] Retrying order creation...`);
                    srOrderRes = await createShiprocketOrder(srPayload);
                } else {
                    console.warn(`[SHIPROCKET AUTO-SYNC] Failed to register pickup location:`, syncRes?.message || 'Unknown error');
                }
            } catch (syncError) {
                console.error(`[SHIPROCKET AUTO-SYNC] Exception during registration:`, syncError.message);
            }
        }

        if (!srOrderRes || !srOrderRes.order_id) {
            console.error(`[SHIPROCKET] Error Response:`, JSON.stringify(srOrderRes));
            throw new Error(srOrderRes.message || "Shiprocket: Failed to create order.");
        }

        console.log(`[SHIPROCKET] Order created successfully. SR_ID: ${srOrderRes.order_id}`);
        const srOrderId = srOrderRes.order_id;
        const shipmentId = srOrderRes.shipment_id;

        // 6. STEP 2: Intelligent Courier Selection (Serviceability)
        const svcParams = {
            pickup_postcode: pickupLocation.pincode,
            delivery_postcode: order.pincode,
            weight: srPayload.weight,
            cod: order.payment_method === 'cod' ? 1 : 0,
            is_return: 0
        };
        
        const svcRes = await getShiprocketServiceability(svcParams);
        let selectedCourierId = null;
        let courierName = "Shiprocket Auto";

        if (svcRes && svcRes.status === 200 && svcRes.data.available_courier_companies.length > 0) {
            const bestCourier = svcRes.data.available_courier_companies.sort((a, b) => Number(a.rate) - Number(b.rate))[0];
            selectedCourierId = bestCourier.courier_company_id;
            courierName = bestCourier.courier_name;
        }

        // 7. STEP 3: Assign AWB
        let awbCode = null;
        if (selectedCourierId) {
            const awbRes = await assignShiprocketAWB({
                shipment_id: shipmentId,
                courier_id: selectedCourierId
            });
            if (awbRes.status === 200) {
                awbCode = awbRes.response.data.awb_code;
            }
        }

        // 8. STEP 4: Generate Pickup
        if (awbCode) {
            await generateShiprocketPickup([shipmentId]);
        }

        // 9. Save to shiprocket_orders table
        await client.query(`
            INSERT INTO shiprocket_orders (
                sr_order_id, order_id, shipment_id, sr_status, awb_code, courier_name, sr_created_at, updated_at
            ) VALUES ($1, $2, $3, 'READY_TO_SHIP', $4, $5, NOW(), NOW())
            ON CONFLICT (order_id) DO UPDATE SET 
                shipment_id = EXCLUDED.shipment_id,
                sr_status = EXCLUDED.sr_status,
                awb_code = EXCLUDED.awb_code,
                courier_name = EXCLUDED.courier_name,
                updated_at = NOW()
        `, [srOrderId.toString(), order.order_id, shipmentId.toString(), awbCode, courierName]);

        console.log(`[SHIPROCKET] === DISPATCH COMPLETED FOR ORDER: ${orderId} ===`);
        return { 
            sr_order_id: srOrderId, 
            shipment_id: shipmentId, 
            awb_code: awbCode, 
            courier: courierName 
        };
    } catch (error) {
        console.error(`[SHIPROCKET FATAL ERROR] Order ${orderId}:`, error.message);
        throw error;
    }
};

/**
 * Initiate shipment manually via API
 */
export const initiateShipment = async (req, res) => {
    const { orderId } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const srResponse = await pushOrderToShiprocket(orderId, client);

        // Update order status locally
        await client.query(`
            UPDATE orders SET order_status = 'Processing', courier = 'Shiprocket', tracking_id = $1 WHERE order_id = $2
        `, [srResponse.shipment_id.toString(), orderId]);

        // Dispatch notifications
        await sendOrderStatusNotifications(orderId, 'Processing', client);

        await client.query('COMMIT');
        console.log(`[SHIPROCKET LOG] SUCCESS: Order ${orderId} successfully dispatched!`);
        return res.status(200).json({ success: true, message: "Shipment initiated", data: srResponse });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`\n[SHIPROCKET ERROR] Failed to dispatch order ${orderId}:`, error.message);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

/**
 * Cancel shipment in Shiprocket
 */
export const cancelShipment = async (orderId, client = pool) => {
    try {
        // 1. Get Shiprocket Order ID from our table
        const srOrderRes = await client.query("SELECT sr_order_id, shipment_id FROM shiprocket_orders WHERE order_id = $1", [orderId]);
        
        if (srOrderRes.rows.length === 0) {
            console.log("No Shiprocket record found for order cancellation, skipping SR API call.");
            return;
        }

        const { shipment_id } = srOrderRes.rows[0];

        // 2. Call Shiprocket Cancel API
        // Shiprocket cancel expects an array of IDs. We use the shipment_id or order_id.
        // For adhoc orders, we use the order_id we provided or the one they generated.
        const srResponse = await cancelShiprocketOrder([shipment_id]);

        if (srResponse.status_code === 200) {
            await client.query("UPDATE shiprocket_orders SET sr_status = 'CANCELLED', updated_at = NOW() WHERE order_id = $1", [orderId]);
            console.log(`Shiprocket order ${shipment_id} cancelled successfully.`);
        } else {
            console.warn(`Shiprocket Cancellation Warning: ${srResponse.message}`);
        }
    } catch (error) {
        console.error("Cancel Shipment Error:", error.message);
    }
};

/**
 * Get serviceability details for an order
 */
export const getServiceability = async (req, res) => {
    const { orderId } = req.params;
    try {
        // 1. Fetch Order and Pickup Details
        const orderRes = await pool.query(`
            SELECT o.pincode, o.payment_method, o.subtotal,
                   (SELECT pincode FROM seller_pickup_location WHERE seller_id = (SELECT seller_id FROM order_items WHERE order_id = o.order_id LIMIT 1) AND is_default = true) as pickup_pincode,
                   (SELECT SUM(p.weight * oi.quantity) FROM order_items oi JOIN products p ON oi.product_id = p.product_id WHERE oi.order_id = o.order_id) as weight
            FROM orders o
            WHERE o.order_id = $1
        `, [orderId]);

        if (orderRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const order = orderRes.rows[0];

        // 2. Call Shiprocket Serviceability API
        const svcRes = await getShiprocketServiceability({
            pickup_postcode: order.pickup_pincode,
            delivery_postcode: order.pincode,
            weight: order.weight || 0.5,
            cod: order.payment_method === 'cod' ? 1 : 0
        });

        if (svcRes.status === 200) {
            return res.status(200).json({ success: true, data: svcRes.data });
        } else {
            return res.status(400).json({ success: false, message: svcRes.message || "Failed to fetch serviceability" });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Fetch and update tracking info from Shiprocket
 */
export const syncTracking = async (req, res) => {
    const { orderId } = req.params;
    try {
        const srOrder = await pool.query("SELECT awb_code FROM shiprocket_orders WHERE order_id = $1", [orderId]);
        if (srOrder.rows.length === 0 || !srOrder.rows[0].awb_code) {
            return res.status(404).json({ success: false, message: "No AWB assigned yet" });
        }
        const tracking = await getShiprocketTracking(srOrder.rows[0].awb_code);
        return res.status(200).json({ success: true, data: tracking });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Handle incoming webhooks from Shiprocket
 */
export const handleShiprocketWebhook = async (req, res) => {
    // Shiprocket expects a 200 OK fast.
    res.status(200).send('OK');

    // 1. Verify Webhook Token (Security Guard)
    const token = req.headers['x-api-key'] || req.query.token;
    const expectedToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;
    
    if (!expectedToken || token !== expectedToken) {
        console.warn("[WEBHOOK] Unauthorized access attempt detected.");
        return res.status(401).send('Unauthorized');
    }

    const payload = req.body;
    if (!payload || !payload.awb) return;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Log the webhook payload
        await client.query(`
            INSERT INTO shiprocket_webhook_log (webhook_id, sr_order_id, event_type, raw_payload, is_processed, received_at)
            VALUES (gen_random_uuid(), $1, $2, $3, true, NOW())
        `, [payload.order_id?.toString() || null, payload.current_status, JSON.stringify(payload)]);

        // 2. Extract Data
        const awb = payload.awb;
        const currentStatus = payload.current_status?.toUpperCase() || '';
        const shipmentId = payload.shipment_id?.toString();
        const srOrderId = payload.order_id?.toString();
        const courierName = payload.courier_name || '';

        // 3. Find our local order ID
        let localOrderId = null;
        if (srOrderId) {
            const srRes = await client.query('SELECT order_id FROM shiprocket_orders WHERE sr_order_id = $1', [srOrderId]);
            if (srRes.rows.length > 0) localOrderId = srRes.rows[0].order_id;
        }

        if (!localOrderId && payload.channel_order_id) {
            localOrderId = payload.channel_order_id; // Usually channel_order_id is our local order UUID
        }

        if (!localOrderId) {
            await client.query('ROLLBACK');
            return;
        }

        // 4. Update shiprocket_orders with AWB if missing
        await client.query(`
            UPDATE shiprocket_orders 
            SET awb_code = $1, courier_name = COALESCE(NULLIF($2, ''), courier_name), sr_status = $3, updated_at = NOW()
            WHERE order_id = $4
        `, [awb, courierName, currentStatus, localOrderId]);

        // 5. Update shiprocket_tracking
        await client.query(`
            INSERT INTO shiprocket_tracking (tracking_id, sr_order_id, awb_code, current_status, activity_log, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
        `, [srOrderId, awb, currentStatus, JSON.stringify(payload.scans || [])]);

        // 6. Map Shiprocket Status to Local Status
        let newLocalStatus = null;
        if (['SHIPPED', 'IN TRANSIT', 'OUT FOR DELIVERY', 'PICKED UP'].includes(currentStatus)) {
            newLocalStatus = 'Shipped';
        } else if (currentStatus === 'DELIVERED') {
            newLocalStatus = 'Delivered';
        } else if (currentStatus === 'CANCELED' || currentStatus === 'CANCELLED') {
            newLocalStatus = 'Cancelled';
        }

        // 7. Update Main Orders Table and Deliveries Table
        if (newLocalStatus) {
            // Check if status is actually changing to avoid spamming notifications
            const currentOrder = await client.query('SELECT order_status FROM orders WHERE order_id = $1', [localOrderId]);
            const isStatusChanging = currentOrder.rows.length > 0 && currentOrder.rows[0].order_status !== newLocalStatus;

            if (isStatusChanging) {
                await client.query(`
                    UPDATE orders 
                    SET order_status = $1, tracking_id = $2, courier = COALESCE(NULLIF($3, ''), courier), updated_at = NOW()
                    WHERE order_id = $4
                `, [newLocalStatus, awb, courierName, localOrderId]);

                // Sync Deliveries table
                await client.query(`
                    INSERT INTO deliveries (delivery_id, order_id, courier_name, awb_code, shipping_status, dispatched_at, delivered_at, updated_at, created_at)
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, 
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
                `, [localOrderId, courierName || 'Shiprocket', awb, newLocalStatus]);

                // 8. Trigger Notifications
                await sendOrderStatusNotifications(localOrderId, newLocalStatus, client, courierName, awb);
            }
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Shiprocket Webhook Processing Error:", err.message);
    } finally {
        client.release();
    }
};
