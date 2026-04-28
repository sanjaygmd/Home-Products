import { pool } from './configs/db.js';

async function update() {
    try {
        const res = await pool.query(
            "UPDATE seller_pickup_location SET location_name = $1 WHERE location_name = 'Primary Warehouse'",
            ['Main Pickup Place']
        );
        console.log(`Successfully updated ${res.rowCount} pickup locations to 'Main Pickup Place'.`);
    } catch (err) {
        console.error("Update failed:", err.message);
    } finally {
        process.exit();
    }
}

update();
