import { pool } from './configs/db.js';

async function checkProducts() {
    try {
        const result = await pool.query("SELECT COUNT(*) FROM products WHERE deleted_at IS NULL");
        console.log("Total Products (Active):", result.rows[0].count);
        
        const sample = await pool.query("SELECT product_id, name, seller_id FROM products WHERE deleted_at IS NULL LIMIT 5");
        console.log("Sample Products:", JSON.stringify(sample.rows, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkProducts();
