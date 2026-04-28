import { pool } from "../configs/db.js";

const fixForeignKeys = async () => {
    try {
        console.log("Fixing foreign keys for sellers...");

        // Addresses
        await pool.query(`ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_seller_id_fkey`);
        await pool.query(`ALTER TABLE addresses ADD CONSTRAINT addresses_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`);

        // Bank Accounts
        await pool.query(`ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_owner_id_fkey`);
        // Bank accounts might reference sellers or customers, assuming there's no complex polymorphic constraint, or if it's polymorphic, maybe there's no FK at all. Let's check if it exists.
        try {
            await pool.query(`ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`);
        } catch(e) {}

        // Seller Pickup Location
        await pool.query(`ALTER TABLE seller_pickup_location DROP CONSTRAINT IF EXISTS seller_pickup_location_seller_id_fkey`);
        await pool.query(`ALTER TABLE seller_pickup_location ADD CONSTRAINT seller_pickup_location_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`);

        // Products
        await pool.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_seller_id_fkey`);
        await pool.query(`ALTER TABLE products ADD CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`);

        // Seller Commissions
        await pool.query(`ALTER TABLE seller_commissions DROP CONSTRAINT IF EXISTS seller_commissions_seller_id_fkey`);
        await pool.query(`ALTER TABLE seller_commissions ADD CONSTRAINT seller_commissions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`);

        console.log("Done fixing foreign keys.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

fixForeignKeys();
