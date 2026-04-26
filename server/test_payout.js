import { pool } from './configs/db.js';
import { requestPayout } from './controllers/PayoutController.js';

async function testRequest() {
    const req = {
        body: {
            seller_id: '', 
            notes: 'Test request'
        }
    };
    const res = {
        status: function(code) {
            console.log("Status Code:", code);
            return this;
        },
        json: function(data) {
            console.log("Response Data:", data);
            return this;
        }
    };

    try {
        const sellerRes = await pool.query("SELECT seller_id FROM sellers LIMIT 1");
        if (sellerRes.rows.length > 0) {
            req.body.seller_id = sellerRes.rows[0].seller_id;
            console.log("Testing with seller_id:", req.body.seller_id);
            await requestPayout(req, res);
        } else {
            console.log("No sellers found to test with.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Test execution error:", err);
        process.exit(1);
    }
}

testRequest();
