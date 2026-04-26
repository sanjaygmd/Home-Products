import { pool } from '../configs/db.js';

// Get earnings summary for a seller
export const getSellerEarningsSummary = async (req, res) => {
    const { sellerId } = req.params;
    try {
        const result = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN LOWER(sc.status) = 'pending' AND o.order_status = 'Delivered' THEN sc.seller_earnings ELSE 0 END), 0) as withdrawable_balance,
                COALESCE(SUM(CASE WHEN LOWER(sc.status) = 'pending' AND o.order_status != 'Delivered' THEN sc.seller_earnings ELSE 0 END), 0) as pending_delivery,
                COALESCE(SUM(CASE WHEN LOWER(sc.status) = 'processing' THEN sc.seller_earnings ELSE 0 END), 0) as processing_payouts,
                COALESCE(SUM(CASE WHEN LOWER(sc.status) = 'paid' THEN sc.seller_earnings ELSE 0 END), 0) as paid_earnings,
                COALESCE(SUM(sc.seller_earnings), 0) as total_earnings
            FROM seller_commissions sc
            JOIN orders o ON sc.order_id = o.order_id
            WHERE sc.seller_id = $1
        `, [sellerId]);

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching earnings summary", error: error.message });
    }
};

// Get payout history for a seller
export const getSellerPayoutHistory = async (req, res) => {
    const { sellerId } = req.params;
    try {
        const result = await pool.query(
            "SELECT * FROM seller_payouts WHERE seller_id = $1 ORDER BY created_at DESC",
            [sellerId]
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching payout history", error: error.message });
    }
};

// Get all pending commissions for a seller (eligible for payout)
export const getPendingCommissions = async (req, res) => {
    const { sellerId } = req.params;
    try {
        const result = await pool.query(`
            SELECT sc.* FROM seller_commissions sc
            JOIN orders o ON sc.order_id = o.order_id
            WHERE sc.seller_id = $1 
            AND LOWER(sc.status) = 'pending' 
            AND o.order_status = 'Delivered'
            ORDER BY sc.created_at ASC
        `, [sellerId]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching pending commissions", error: error.message });
    }
};

// Seller: Request a payout for current pending balance
export const requestPayout = async (req, res) => {
    const { seller_id, notes } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Calculate total withdrawable balance (Only from Delivered orders)
        const balanceRes = await client.query(`
            SELECT 
                COALESCE(SUM(sc.seller_earnings), 0) as balance, 
                MIN(sc.created_at) as start_date, 
                MAX(sc.created_at) as end_date
            FROM seller_commissions sc
            JOIN orders o ON sc.order_id = o.order_id
            WHERE sc.seller_id = $1 
            AND LOWER(sc.status) = 'pending'
            AND o.order_status = 'Delivered'
        `, [seller_id]);

        const amount = parseFloat(balanceRes.rows[0].balance);
        const startDate = balanceRes.rows[0].start_date;
        const endDate = balanceRes.rows[0].end_date;

        if (amount <= 0) {
            return res.status(400).json({ success: false, message: "No withdrawable balance (from delivered orders) to request payout." });
        }

        // 2. Create the payout request record
        const payoutRes = await client.query(`
            INSERT INTO seller_payouts (
                payout_id, seller_id, amount, payout_period_start, payout_period_end, status, notes, created_at
            ) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'Requested', $5, NOW())
            RETURNING payout_id
        `, [seller_id, amount, startDate, endDate, notes]);

        const payoutId = payoutRes.rows[0].payout_id;

        // 3. Link and mark only 'Delivered' pending commissions as 'processing'
        await client.query(`
            UPDATE seller_commissions 
            SET status = 'processing',
                payout_id = $1::uuid
            WHERE seller_id = $2::uuid 
            AND LOWER(status) = 'pending' 
            AND created_at >= $3 
            AND created_at <= $4
            AND order_id IN (SELECT order_id FROM orders WHERE order_status = 'Delivered')
        `, [payoutId, seller_id, startDate, endDate]);

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: "Payout request submitted successfully", payout_id: payoutId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("REQUEST PAYOUT ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Failed to request payout",
            error: error.message,
            detail: error.detail
        });
    } finally {
        client.release();
    }
};

// Admin: Get all payout records
export const getAllPayouts = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, s.store_name, s.full_name as seller_name, s.email as seller_email
            FROM seller_payouts p
            JOIN sellers s ON p.seller_id = s.seller_id
            ORDER BY p.created_at DESC
        `);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching payouts", error: error.message });
    }
};

// Admin: Update payout status (Approve/Reject)
export const updatePayoutStatus = async (req, res) => {
    const { payout_id } = req.params;
    const { status, admin_id, transaction_ref, notes } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get payout details
        const payoutRes = await client.query("SELECT * FROM seller_payouts WHERE payout_id = $1::uuid", [payout_id]);
        if (payoutRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Payout record not found" });
        }
        const payout = payoutRes.rows[0];

        // Ensure admin_id is a valid UUID or NULL
        const finalAdminId = (admin_id && admin_id.length === 36) ? admin_id : null;

        // 2. Update payout record
        await client.query(`
            UPDATE seller_payouts 
            SET status = $1::varchar, 
                initiated_by_admin_id = $2::uuid, 
                transaction_ref = $3, 
                notes = COALESCE($4, notes),
                completed_at = CASE WHEN $1::varchar = 'Paid' THEN NOW() ELSE NULL END
            WHERE payout_id = $5::uuid
        `, [status, finalAdminId, transaction_ref, notes, payout_id]);

        // 3. Update commissions based on status - USING payout_id LINK
        if (status === 'Paid') {
            // Mark commissions as Paid
            const commissionUpdate = await client.query(`
                UPDATE seller_commissions 
                SET status = 'paid' 
                WHERE payout_id = $1::uuid
            `, [payout_id]);

            console.log(`Updated ${commissionUpdate.rowCount} commissions to 'paid' for payout ${payout_id}`);

            // Log the finance transaction
            await client.query(`
                INSERT INTO finance_transactions (
                    finance_transactions_id, order_id, payment_id, seller_payout_id, 
                    transaction_type, amount, created_at, daily_finance_id
                ) VALUES (
                    gen_random_uuid(), NULL, NULL, $1::uuid, 'payout', $2, NOW(), NULL
                )
            `, [payout_id, payout.amount]);

        } else if (status === 'Rejected') {
            // Revert commissions to 'pending'
            await client.query(`
                UPDATE seller_commissions 
                SET status = 'pending',
                    payout_id = NULL 
                WHERE payout_id = $1::uuid
            `, [payout_id]);
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: `Payout request ${status.toLowerCase()} successfully` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("UPDATE PAYOUT STATUS ERROR:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to update payout status", 
            error: error.message
        });
    } finally {
        client.release();
    }
};

// Admin: Initiate a payout for a seller (Direct)
export const initiatePayout = async (req, res) => {
    const { seller_id, admin_id, amount, payment_method, transaction_ref, notes, payout_period_start, payout_period_end } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create the payout record
        const payoutRes = await client.query(`
            INSERT INTO seller_payouts (
                payout_id, seller_id, initiated_by_admin_id, amount, payment_method, transaction_ref, 
                payout_period_start, payout_period_end, status, notes, created_at, completed_at
            ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'Paid', $8, NOW(), NOW())
            RETURNING payout_id
        `, [seller_id, admin_id, amount, payment_method, transaction_ref, payout_period_start, payout_period_end, notes]);

        const payoutId = payoutRes.rows[0].payout_id;

        // 2. Update the commissions to 'Paid'
        await client.query(`
            UPDATE seller_commissions 
            SET status = 'Paid' 
            WHERE seller_id = $1 
            AND (status = 'Pending' OR status = 'Processing')
            AND created_at >= $2 
            AND created_at <= $3
        `, [seller_id, payout_period_start, payout_period_end]);

        // 3. Log the finance transaction
        await client.query(`
            INSERT INTO finance_transactions (
                finance_transactions_id, order_id, payment_id, seller_payout_id, 
                transaction_type, amount, created_at, daily_finance_id
            ) VALUES (gen_random_uuid(), NULL, NULL, $1::uuid, 'payout', $2, NOW(), NULL)
        `, [payoutId, amount]);

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: "Payout processed successfully", payout_id: payoutId });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: "Failed to initiate payout", error: error.message });
    } finally {
        client.release();
    }
};

// Internal: Automatically process payout for a delivered order
export const processAutoPayout = async (orderId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get all pending commissions for this order
        const commissionsRes = await client.query(`
            SELECT seller_id, SUM(seller_earnings) as amount, MIN(created_at) as min_date, MAX(created_at) as max_date
            FROM seller_commissions 
            WHERE order_id = $1 AND LOWER(status) = 'pending'
            GROUP BY seller_id
        `, [orderId]);

        for (const row of commissionsRes.rows) {
            const { seller_id, amount, min_date, max_date } = row;

            // 2. Create the payout record
            const payoutId = (await client.query(`
                INSERT INTO seller_payouts (
                    payout_id, seller_id, amount, payout_period_start, payout_period_end, status, 
                    notes, transaction_ref, created_at, completed_at
                ) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'Paid', 'Automatic payout on delivery', $5, NOW(), NOW())
                RETURNING payout_id
            `, [seller_id, amount, min_date, max_date, `AUTO-${orderId}`])).rows[0].payout_id;

            // 3. Update commissions to 'Paid'
            await client.query(`
                UPDATE seller_commissions 
                SET status = 'Paid' 
                WHERE order_id = $1 AND seller_id = $2 AND LOWER(status) = 'pending'
            `, [orderId, seller_id]);

            // 4. Log to finance transactions
            await client.query(`
                INSERT INTO finance_transactions (
                    transaction_id, seller_payout_id, transaction_type, amount, created_at
                ) VALUES (gen_random_uuid(), $1, 'payout', $2, NOW())
            `, [payoutId, amount]);
        }

        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Auto payout failed for order", orderId, error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
};
