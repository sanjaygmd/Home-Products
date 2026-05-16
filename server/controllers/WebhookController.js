import crypto from 'crypto';
import { pool } from '../configs/db.js';

/**
 * Handles Razorpay Webhooks (Pattern from Gift Ecommerce)
 * This provides high-integrity payment handling for edge cases where the 
 * customer's browser closes before the frontend can confirm the order.
 */
export const handleRazorpayWebhook = async (req, res) => {
    // 1. Signature Verification
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || secret === 'your_webhook_secret_here') {
        console.error('[WEBHOOK ERROR] RAZORPAY_WEBHOOK_SECRET is not configured.');
        return res.status(500).send('Webhook secret not configured');
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
        return res.status(400).send('Missing signature');
    }

    // req.body should be the raw body for HMAC verification
    // Express must be configured with express.raw() for this route
    const payload = req.body.toString(); 

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    if (expectedSignature !== signature) {
        console.warn(`[WEBHOOK ALERT] Invalid signature received from IP: ${req.ip}`);
        return res.status(400).send('Invalid signature');
    }

    let parsedBody;
    try {
        parsedBody = JSON.parse(payload);
    } catch (err) {
        return res.status(400).send('Invalid JSON payload');
    }

    const event = parsedBody.event;
    const paymentEntity = parsedBody.payload?.payment?.entity;
    
    if (!paymentEntity) {
        return res.status(200).send('OK');
    }

    const payment_id = paymentEntity.id;
    const razorpay_order_id = paymentEntity.order_id;
    const amount = paymentEntity.amount / 100;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (event === 'payment.captured') {
            // Check if payment already exists
            const paymentCheck = await client.query(
                "SELECT payment_id FROM payments WHERE transaction_id = $1 FOR UPDATE", 
                [payment_id]
            );

            if (paymentCheck.rows.length === 0) {
                // Orphaned payment handling
                await client.query(`
                    INSERT INTO orphaned_payments (payment_id, razorpay_order_id, amount, status, notes)
                    VALUES ($1, $2, $3, 'Captured', 'Webhook received before frontend confirmation')
                    ON CONFLICT (payment_id) DO NOTHING
                `, [payment_id, razorpay_order_id, amount]);
                console.log(`[WEBHOOK] Logged orphaned payment: ${payment_id}`);
            }
        } else if (event === 'refund.processed') {
            const refundEntity = parsedBody.payload.refund.entity;
            const refund_id = refundEntity.id;

            // Update associated order/payment
            const paymentCheck = await client.query(
                "SELECT order_id FROM payments WHERE transaction_id = $1 FOR UPDATE",
                [payment_id]
            );

            if (paymentCheck.rows.length > 0 && paymentCheck.rows[0].order_id) {
                const order_id = paymentCheck.rows[0].order_id;
                
                await client.query("UPDATE orders SET payment_status = 'Refunded' WHERE order_id = $1", [order_id]);
                await client.query("UPDATE payments SET payment_status = 'Refunded' WHERE transaction_id = $1", [payment_id]);

                await client.query(`
                    INSERT INTO finance_transactions (finance_transactions_id, order_id, transaction_type, amount, notes)
                    VALUES (gen_random_uuid(), $1, 'refund', $2, $3)
                `, [order_id, -amount, `Webhook Refund ID: ${refund_id}`]);
            } else {
                await client.query(
                    "UPDATE orphaned_payments SET status = 'Refunded', notes = $1 WHERE payment_id = $2",
                    [`Refunded via Razorpay (${refund_id})`, payment_id]
                );
            }
            console.log(`[WEBHOOK] Processed refund for payment: ${payment_id}`);
        }

        await client.query('COMMIT');
        res.status(200).send('Webhook processed successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[WEBHOOK ERROR]:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        client.release();
    }
};
