import { addShiprocketPickupLocation } from './utils/shiprocket.js';
import { pool } from './configs/db.js';

async function register() {
    try {
        const res = await pool.query("SELECT * FROM seller_pickup_location WHERE location_name = 'Main Pickup Place' LIMIT 1");
        if (res.rows.length === 0) {
            console.error("No pickup location found with name 'Main Pickup Place' in DB.");
            return;
        }

        const details = res.rows[0];
        console.log(`Registering '${details.location_name}' with Shiprocket...`);
        
        const srRes = await addShiprocketPickupLocation(details);
        console.log("Shiprocket Response:", JSON.stringify(srRes, null, 2));

    } catch (err) {
        console.error("Registration failed:", err.message);
    } finally {
        process.exit();
    }
}

register();
