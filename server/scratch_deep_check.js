import { pool } from './configs/db.js';

async function deepCheckProducts() {
    try {
        const result = await pool.query("SELECT * FROM products");
        console.log("Total Products in DB:", result.rows.length);
        result.rows.forEach((p, i) => {
            console.log(`Product ${i + 1}:`, {
                id: p.product_id,
                name: p.name,
                deleted_at: p.deleted_at,
                is_active: p.is_active,
                seller_id: p.seller_id,
                category_id: p.category_id
            });
        });
        
        const sessions = await pool.query("SELECT * FROM auth_sessions WHERE expires_at > NOW() ORDER BY created_at DESC LIMIT 5");
        console.log("Recent Sessions:", sessions.rows.map(s => ({ type: s.user_type, id: s.user_ref_id })));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

deepCheckProducts();
