import { pool } from '../configs/db.js';
import { addShiprocketPickupLocation } from '../utils/shiprocket.js';

// Get all pickup locations for a seller
export const getSellerPickups = async (req, res) => {
    const { sellerId } = req.params;

    if (req.user.type === 'seller' && req.user.id !== sellerId) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to pickup locations' });
    }

    try {
        const result = await pool.query(
            "SELECT * FROM seller_pickup_location WHERE seller_id = $1 ORDER BY created_at DESC",
            [sellerId]
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('GET SELLER PICKUPS ERROR:', error);
        res.status(500).json({ success: false, message: "Error fetching pickup locations" });
    }
};


// Add a new pickup location
export const addPickupLocation = async (req, res) => {
    const { 
        seller_id, location_name, contact_name, contact_phone, 
        address_line_1, city, state, pincode, is_default 
    } = req.body;

    if (req.user.type === 'seller' && req.user.id !== seller_id) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You can only add pickup locations for your own account' });
    }


    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // If this is set as default, unset previous default
        if (is_default) {
            await client.query(
                "UPDATE seller_pickup_location SET is_default = false WHERE seller_id = $1",
                [seller_id]
            );
        }

        // 1. Save to local database
        const localResult = await client.query(`
            INSERT INTO seller_pickup_location (
                pickup_id, seller_id, location_name, contact_name, contact_phone, 
                address_line_1, city, state, pincode, is_default, is_active, created_at
            ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
            RETURNING *
        `, [seller_id, location_name, contact_name, contact_phone, address_line_1, city, state, pincode, is_default || false]);

        const newLocation = localResult.rows[0];

        // 2. Sync with Shiprocket
        try {
            const srResponse = await addShiprocketPickupLocation(newLocation);
            // Shiprocket returns status_code 200 for success in some versions, or a success boolean
            if (srResponse && (srResponse.success || srResponse.status_code === 200)) {
                const addressId = srResponse.address_id || (srResponse.data && srResponse.data.address_id);
                if (addressId) {
                    await client.query(
                        "UPDATE seller_pickup_location SET shipment_location_id = $1 WHERE pickup_id = $2",
                        [addressId.toString(), newLocation.pickup_id]
                    );

                }
            } else {
                console.warn('[SHIPROCKET] Pickup Sync Warning:', srResponse.message || 'Unknown error');
            }
        } catch (srError) {
            console.error('[SHIPROCKET] Sync Exception:', srError.message);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: "Pickup location added", data: newLocation });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('ADD PICKUP LOCATION ERROR:', error);
        res.status(500).json({ success: false, message: "Error adding pickup location" });
    } finally {

        client.release();
    }
};

// Update a pickup location
export const updatePickupLocation = async (req, res) => {
    const { pickupId } = req.params;
    const { 
        location_name, contact_name, contact_phone, 
        address_line_1, city, state, pincode, is_default, is_active 
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get seller_id first
        const sellerRes = await client.query("SELECT seller_id FROM seller_pickup_location WHERE pickup_id = $1", [pickupId]);
        if (sellerRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Pickup location not found" });
        }
        const seller_id = sellerRes.rows[0].seller_id;

        if (req.user.type === 'seller' && req.user.id !== seller_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this pickup location' });
        }


        // If this is set as default, unset previous default
        if (is_default) {
            await client.query(
                "UPDATE seller_pickup_location SET is_default = false WHERE seller_id = $1",
                [seller_id]
            );
        }

        const result = await client.query(`
            UPDATE seller_pickup_location 
            SET location_name = COALESCE($1, location_name),
                contact_name = COALESCE($2, contact_name),
                contact_phone = COALESCE($3, contact_phone),
                address_line_1 = COALESCE($4, address_line_1),
                city = COALESCE($5, city),
                state = COALESCE($6, state),
                pincode = COALESCE($7, pincode),
                is_default = COALESCE($8, is_default),
                is_active = COALESCE($9, is_active)
            WHERE pickup_id = $10
            RETURNING *
        `, [location_name, contact_name, contact_phone, address_line_1, city, state, pincode, is_default, is_active, pickupId]);

        const updatedLocation = result.rows[0];

        // Sync with Shiprocket
        try {
            await addShiprocketPickupLocation(updatedLocation);

        } catch (srError) {
            console.error('[SHIPROCKET] Update Sync Exception:', srError.message);
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: "Pickup location updated", data: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('UPDATE PICKUP LOCATION ERROR:', error);
        res.status(500).json({ success: false, message: "Error updating pickup location" });
    } finally {

        client.release();
    }
};

// Delete a pickup location
export const deletePickupLocation = async (req, res) => {
    const { pickupId } = req.params;
    try {
        // Ownership Check
        const sellerRes = await pool.query("SELECT seller_id FROM seller_pickup_location WHERE pickup_id = $1", [pickupId]);
        if (sellerRes.rows.length > 0) {
            const seller_id = sellerRes.rows[0].seller_id;
            if (req.user.type === 'seller' && req.user.id !== seller_id) {
                return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this pickup location' });
            }
            await pool.query("DELETE FROM seller_pickup_location WHERE pickup_id = $1", [pickupId]);
        }

        res.status(200).json({ success: true, message: "Pickup location deleted" });
    } catch (error) {
        console.error('DELETE PICKUP LOCATION ERROR:', error);
        res.status(500).json({ success: false, message: "Error deleting pickup location" });
    }
};

