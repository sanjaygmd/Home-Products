import { pool } from '../configs/db.js';
import { updatePayoutStatus } from '../controllers/PayoutController.js';

async function testUpdate() {
    const req = {
        params: { payout_id: '' },
        body: {
            status: 'Paid',
            admin_id: '8682e057-0174-4530-811c-c0c804be394a', // placeholder
            transaction_ref: 'TEST-123',
            notes: 'Test approval'
        }
    };
    const res = {
        status: function(code) { console.log("Status:", code); return this; },
        json: function(data) { console.log("Data:", data); return this; }
    };

    try {
        // Create a dummy payout first to test update
        const sellerRes = await pool.query("SELECT seller_id FROM sellers LIMIT 1");
        if (sellerRes.rows.length === 0) return console.log("No sellers");
        const sellerId = sellerRes.rows[0].seller_id;

        const payoutRes = await pool.query(`
            INSERT INTO seller_payouts (
                payout_id, seller_id, amount, status, created_at, 
                payout_period_start, payout_period_end
            )
            VALUES (gen_random_uuid(), $1, 100, 'Requested', NOW(), NOW(), NOW())
            RETURNING payout_id
        `, [sellerId]);
        
        req.params.payout_id = payoutRes.rows[0].payout_id;
        console.log("Testing update for payout:", req.params.payout_id);

        await updatePayoutStatus(req, res);
        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
}

testUpdate();
