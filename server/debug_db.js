import { pool } from "./configs/db.js";

async function checkProducts() {
    try {
        const res = await pool.query("SELECT COUNT(*) FROM products");
        console.log("PRODUCT COUNT:", res.rows[0].count);
        process.exit(0);
    } catch (err) {
        console.error("DB CHECK ERROR:", err);
        process.exit(1);
    }
}

checkProducts();
