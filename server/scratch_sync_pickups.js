import { pool } from './configs/db.js';
import { addShiprocketPickupLocation } from './utils/shiprocket.js';

async function syncPickups() {
    try {
        const res = await pool.query("SELECT * FROM seller_pickup_location");
        console.log(`Found ${res.rows.length} pickup locations to sync.`);

        for (const loc of res.rows) {
            console.log(`Syncing: ${loc.location_name}...`);
            const srRes = await addShiprocketPickupLocation(loc);
            if (srRes && (srRes.success || srRes.status_code === 200)) {
                console.log(`✅ Success: ${loc.location_name}`);
            } else {
                console.error(`❌ Failed: ${loc.location_name} - ${JSON.stringify(srRes)}`);
            }
        }
        process.exit(0);
    } catch (error) {
        console.error("Sync Error:", error);
        process.exit(1);
    }
}

syncPickups();
