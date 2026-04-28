import { pool } from './configs/db.js';

async function check() {
    const res = await pool.query("SELECT * FROM seller_pickup_location");
    console.log("Local Pickup Locations:", JSON.stringify(res.rows, null, 2));
    process.exit();
}

check();
