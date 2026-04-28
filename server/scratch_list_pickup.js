import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function getPickupLocations() {
    try {
        // 1. Get Token
        const authRes = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
            email: process.env.SHIPROCKET_EMAIL,
            password: process.env.SHIPROCKET_PASSWORD
        });
        const token = authRes.data.token;

        // 2. Get Pickup Locations
        const locRes = await axios.get('https://apiv2.shiprocket.in/v1/external/settings/get/pickup', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log("VALID PICKUP LOCATIONS FROM SHIPROCKET:");
        console.log(JSON.stringify(locRes.data.data.shipping_address, null, 2));
    } catch (error) {
        console.error("Error fetching locations:", error.response?.data || error.message);
    }
}

getPickupLocations();
