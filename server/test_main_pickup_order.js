import { createShiprocketOrder } from './utils/shiprocket.js';

async function test() {
    const srPayload = {
        order_id: "TEST-" + Date.now(),
        order_date: new Date().toISOString().split('T')[0],
        pickup_location: "Main Pickup Place",
        billing_customer_name: "Test",
        billing_last_name: "User",
        billing_address: "Test Address",
        billing_city: "Coimbatore",
        billing_pincode: "641010",
        billing_state: "Tamil Nadu",
        billing_country: "India",
        billing_email: "test@example.com",
        billing_phone: "9876543210",
        shipping_is_billing: true,
        order_items: [{
            name: "Test Product",
            sku: "TEST-SKU",
            units: 1,
            selling_price: 100
        }],
        payment_method: "Prepaid",
        sub_total: 100,
        length: 10,
        breadth: 10,
        height: 10,
        weight: 0.5
    };

    console.log("Testing order creation with 'Main Pickup Place'...");
    const res = await createShiprocketOrder(srPayload);
    console.log("Response:", JSON.stringify(res, null, 2));
    process.exit();
}

test();
