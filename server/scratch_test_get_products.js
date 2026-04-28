import { pool } from './configs/db.js';

async function testGetAdminProducts() {
    try {
        const productsQuery = `
          SELECT 
            p.*,
            c.name as category_name,
            s.store_name as seller_name,
            (SELECT json_agg(pi.* ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.product_id) as pi_images,
            (SELECT json_agg(pv.*) FROM product_variants pv WHERE pv.product_id = p.product_id) as variants
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.category_id
          LEFT JOIN sellers s ON p.seller_id = s.seller_id
          WHERE p.deleted_at IS NULL
          ORDER BY p.created_at DESC
        `;
        const result = await pool.query(productsQuery);
        console.log("Products Count:", result.rows.length);
        
        if (result.rows.length > 0) {
            const mapped = result.rows.map(p => ({
              ...p,
              id: p.product_id,
              thumbnail: p.pi_images && p.pi_images.length > 0 ? p.pi_images[0].image_url : (p.images && p.images.length > 0 ? p.images[0] : null),
              stock: p.stock_quantity || 0,
              status: p.is_active ? "Active" : "Inactive"
            }));
            console.log("Mapped Sample:", JSON.stringify(mapped[0], null, 2));
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testGetAdminProducts();
