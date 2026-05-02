import { pool } from "./configs/db.js";

async function inspectProducts() {
    try {
        const res = await pool.query("SELECT product_id, name, deleted_at, is_active FROM products");
        console.log("PRODUCTS:", JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error("DB INSPECT ERROR:", err);
        process.exit(1);
    }
}

inspectProducts();
