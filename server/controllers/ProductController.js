import { pool } from "../configs/db.js";
import { logAction } from "../utils/auditLogger.js";
import { sanitizeText, sanitizeDescription, isValidImageUrl } from "../utils/sanitizer.js";

export const addProduct = async (req, res) => {
    try {
        const {
            category_id,
            seller_id,
            name,
            description,
            sku,
            price,
            mrp,
            stock_quantity,
            weight,
            length,
            breadth,
            height,
            brand,
            images, // Array of { url, variantTempId }
            slug,
            variants, // Array of { tempId, name, value, price, stock, weight }
            color,
            size,
            room,
            discount_percent
        } = req.body;

        const cleanName = sanitizeText(name);
        if (!cleanName || !price || !category_id) {
            return res.status(400).json({
                success: false,
                message: "Required fields missing (name, price, category_id)"
            });
        }

        // Validate image URLs to prevent SSRF and Content-Injection
        if (images && Array.isArray(images)) {
            for (const img of images) {
                const url = typeof img === 'string' ? img : img.url;
                if (!isValidImageUrl(url)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid image URL format or unsafe protocol/host detected."
                    });
                }
            }
        }

        const cleanDescription = sanitizeDescription(description);
        const cleanBrand = sanitizeText(brand);
        const cleanColor = sanitizeText(color);
        const cleanSize = sanitizeText(size);
        const cleanRoom = sanitizeText(room);
        const cleanSku = sanitizeText(sku);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const sellerIdToUse = req.user.type === 'seller' ? req.user.id : (seller_id || null);

        const productResult = await client.query(
            `INSERT INTO products 
            (product_id, category_id, seller_id, name, description, sku, price, mrp, stock_quantity, weight, length, breadth, height, brand, images, slug, color, size, room, discount_percent) 
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
            RETURNING *`,
            [
                category_id,
                sellerIdToUse,
                cleanName,
                cleanDescription,
                cleanSku,
                price,
                mrp,
                stock_quantity || 0,
                weight || 0,
                length || 0,
                breadth || 0,
                height || 0,
                cleanBrand,
                (images && images.length > 0) ? images.map(img => typeof img === 'string' ? img : img.url) : [],
                slug || cleanName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
                cleanColor,
                cleanSize,
                cleanRoom,
                discount_percent || 0
            ]
        );

            const product = productResult.rows[0];

            // Insert into product_variants and keep map of tempId -> variant_id
            const variantMap = {};
            if (variants && variants.length > 0) {
                for (const variant of variants) {
                    const variantSku = variant.sku || `${product.sku}-var-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
                    const vRes = await client.query(
                        `INSERT INTO product_variants (variant_id, product_id, sku, variant_name, variant_value, price, stock_quantity, weight, name) 
                        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8) 
                        RETURNING variant_id`,
                        [
                            product.product_id,
                            variantSku,
                            variant.name,
                            variant.value,
                            (variant.price || variant.price === 0) ? variant.price : product.price,
                            (variant.stock || variant.stock === 0) ? variant.stock : product.stock_quantity,
                            (variant.weight || variant.weight === 0) ? variant.weight : product.weight,
                            product.name // Default variant name to parent name at creation
                        ]
                    );
                    if (variant.tempId) {
                        variantMap[variant.tempId] = vRes.rows[0].variant_id;
                    }
                }
            }

            // Insert into product_images
            if (images && images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    const img = images[i];
                    const imageUrl = typeof img === 'string' ? img : img.url;
                    const variantId = (typeof img === 'object' && img.variantTempId) ? variantMap[img.variantTempId] : null;

                    await client.query(
                        `INSERT INTO product_images (image_id, product_id, image_url, is_primary, sort_order, variant_id) 
                        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
                        [product.product_id, imageUrl, i === 0, i, variantId]
                    );
                }
            }

            await client.query('COMMIT');

            // Log the action
            await logAction(req, 'ADD_PRODUCT', { product_id: product.product_id, name: product.name });

            return res.status(201).json({
                success: true,
                message: 'Product added successfully',
                data: product
            });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("ADD PRODUCT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });

    }
};

export const getProducts = async (req, res) => {
    try {
        const { seller_id } = req.query;

        let query = `
            SELECT p.*, 
            COALESCE((SELECT AVG(rating)::numeric(10,1) FROM reviews WHERE product_id = p.product_id AND variant_id IS NULL), 0) as rating,
            (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id AND variant_id IS NULL) as reviews_count,
            (SELECT json_agg(pi.* ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.product_id) as pi_images,
            (SELECT json_agg(pv.*) FROM product_variants pv WHERE pv.product_id = p.product_id) as variants
            FROM products p 
            WHERE p.deleted_at IS NULL
        `;
        const queryParams = [];

        if (seller_id && seller_id !== 'null' && seller_id !== 'undefined' && seller_id !== '') {
            query += ` AND p.seller_id = $1::uuid`;
            queryParams.push(seller_id);
        }

        query += ` ORDER BY p.created_at DESC`;

        const result = await pool.query(query, queryParams);

        return res.status(200).json({
            success: true,
            message: 'Getting all products successful',
            data: result.rows
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });

    }
};

export const getCategories = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM categories WHERE is_active = true ORDER BY name ASC");
        return res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error("PRODUCT API ERROR:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getProductsById = async (req, res) => {
    try {
        const { product_id } = req.params;
        const result = await pool.query(`
            SELECT p.*, 
            COALESCE((SELECT AVG(rating)::numeric(10,1) FROM reviews WHERE product_id = p.product_id AND variant_id IS NULL), 0) as rating,
            (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id AND variant_id IS NULL) as reviews_count,
            (SELECT json_agg(pi.* ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.product_id) as pi_images,
            (SELECT json_agg(pv.*) FROM product_variants pv WHERE pv.product_id = p.product_id) as variants
            FROM products p 
            WHERE p.product_id = $1
        `, [product_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Getting product by id successful',
            data: result.rows[0]
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });

    }
};

export const addVariants = async (req, res) => {
    try {
        const { product_id, variants } = req.body;

        if (!product_id || !variants || !Array.isArray(variants)) {
            return res.status(400).json({
                success: false,
                message: "Product ID and variants array are required"
            });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const results = [];
            for (const variant of variants) {
                const res = await client.query(
                    `INSERT INTO product_variants (variant_id, product_id, sku, variant_name, variant_value, price, stock_quantity, weight, name) 
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, (SELECT name FROM products WHERE product_id = $1)) 
                    RETURNING *`,
                    [product_id, variant.sku, variant.name, variant.value, variant.price, variant.stock || 0, variant.weight]
                );
                results.push(res.rows[0]);
            }

            await client.query('COMMIT');

            return res.status(201).json({
                success: true,
                message: 'Variants added successfully',
                data: results
            });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("ADD VARIANTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


export const getProductBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const result = await pool.query(`
            SELECT p.*, 
            COALESCE((SELECT AVG(rating)::numeric(10,1) FROM reviews WHERE product_id = p.product_id AND variant_id IS NULL), 0) as rating,
            (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id AND variant_id IS NULL) as reviews_count,
            (SELECT json_agg(pi.* ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.product_id) as pi_images,
            (SELECT json_agg(pv.*) FROM product_variants pv WHERE pv.product_id = p.product_id) as variants
            FROM products p 
            WHERE p.slug = $1
        `, [slug]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: "Getting product by slug successful",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("GET PRODUCT BY SLUG ERROR:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const updateProduct = async (req, res) => {

    const { product_id } = req.params;
    const {
        name, description, price, mrp, stock_quantity,
        brand, category_id, room, discount_percent, sku,
        weight, length, breadth, height, variants // Array of variants to sync
    } = req.body;

    const cleanName = name !== undefined ? sanitizeText(name) : undefined;
    const cleanDescription = description !== undefined ? sanitizeDescription(description) : undefined;
    const cleanBrand = brand !== undefined ? sanitizeText(brand) : undefined;
    const cleanRoom = room !== undefined ? sanitizeText(room) : undefined;
    const cleanSku = sku !== undefined ? sanitizeText(sku) : undefined;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Ownership Check: Only the owner (seller) or an admin can update
        const ownershipCheck = await client.query("SELECT seller_id FROM products WHERE product_id = $1", [product_id]);
        if (ownershipCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (req.user.type === 'seller' && ownershipCheck.rows[0].seller_id !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this product' });
        }

        // 1. Update the base product record
        const result = await client.query(
            `UPDATE products 
             SET name = COALESCE($1, name), 
                 description = COALESCE($2, description), 
                 price = COALESCE($3, price), 
                 mrp = COALESCE($4, mrp), 
                 stock_quantity = COALESCE($5, stock_quantity), 
                 brand = COALESCE($6, brand), 
                 category_id = COALESCE($7, category_id), 
                 room = COALESCE($8, room), 
                 discount_percent = COALESCE($9, discount_percent), 
                 sku = COALESCE($10, sku),
                 weight = COALESCE($11, weight), 
                 length = COALESCE($12, length), 
                 breadth = COALESCE($13, breadth), 
                 height = COALESCE($14, height),
                 updated_at = NOW()
             WHERE product_id = $15 RETURNING *`,
            [
                cleanName, cleanDescription, price, mrp, stock_quantity,
                cleanBrand, category_id, cleanRoom, discount_percent, cleanSku,
                weight, length, breadth, height,
                product_id
            ]
        );

        const product = result.rows[0];


        // 2. Sync Variants (Smart Sync)
        if (variants && Array.isArray(variants)) {
            const incomingIds = variants.map(v => v.variant_id || v.id || v.tempId).filter(id => id && !String(id).startsWith('v_'));

            // A. Handle existing/updated variants and inserts
            for (const v of variants) {
                const vid = (v.variant_id || v.id || v.tempId);
                const isNew = !vid || String(vid).startsWith('v_');
                const variantSku = v.sku || `${cleanSku || result.rows[0].sku}-var-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

                const cleanVariantName = sanitizeText(v.variant_name || v.name || 'Variant');
                const cleanVariantValue = sanitizeText(v.variant_value || v.value || 'Standard');

                if (isNew) {
                    await client.query(
                        `INSERT INTO product_variants (variant_id, product_id, sku, variant_name, variant_value, price, stock_quantity, weight, name) 
                         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            product_id,
                            variantSku,
                            cleanVariantName,
                            cleanVariantValue,
                            v.price || price,
                            v.stock_quantity || v.stock || 0,
                            v.weight || 0,
                            cleanName || result.rows[0].name // Use new parent name if provided, else existing
                        ]
                    );
                } else {
                    await client.query(
                        `UPDATE product_variants 
                         SET variant_name = $1, variant_value = $2, price = $3, stock_quantity = $4, weight = $5, sku = $6
                         WHERE variant_id = $7 AND product_id = $8`,
                        [cleanVariantName, cleanVariantValue, v.price || price, v.stock_quantity || v.stock || 0, v.weight || 0, variantSku, vid, product_id]
                    );
                }
            }

            // B. Clean up removed variants (Only if NOT used in orders)
            if (incomingIds.length > 0) {
                // Find variants that were NOT in the incoming payload
                const toRemoveRes = await client.query(
                    `SELECT variant_id FROM product_variants 
                     WHERE product_id = $1 AND variant_id NOT IN (${incomingIds.map((_, i) => `$${i + 2}`).join(',')})`,
                    [product_id, ...incomingIds]
                );

                for (const row of toRemoveRes.rows) {
                    try {
                        await client.query('DELETE FROM product_variants WHERE variant_id = $1', [row.variant_id]);
                    } catch (err) {
                        console.warn(`Could not delete variant ${row.variant_id} due to dependencies (likely orders). Keeping as legacy data.`);
                    }
                }
            } else if (variants.length === 0) {
                // If the user removed ALL variants, try to delete all
                const allVariants = await client.query(`SELECT variant_id FROM product_variants WHERE product_id = $1`, [product_id]);
                for (const row of allVariants.rows) {
                    try {
                        await client.query('DELETE FROM product_variants WHERE variant_id = $1', [row.variant_id]);
                    } catch (err) {
                        console.warn(`Could not delete variant ${row.variant_id} due to dependencies.`);
                    }
                }
            }
        }

        // 3. Log the action
        await logAction(req, 'UPDATE_PRODUCT', { product_id, updates: req.body });

        // 4. Fetch full product with joins to return to frontend
        const fullProduct = await client.query(`
            SELECT p.*, 
            (SELECT json_agg(pi.* ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.product_id) as pi_images,
            (SELECT json_agg(pv.*) FROM product_variants pv WHERE pv.product_id = p.product_id) as variants
            FROM products p 
            WHERE p.product_id = $1
        `, [product_id]);

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: 'Product family updated successfully',
            data: fullProduct.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('UPDATE PRODUCT FAMILY ERROR:', error);
        return res.status(500).json({ success: false, message: 'Error updating product family' });
    } finally {
        client.release();
    }
}

export const deleteProduct = async (req, res) => {
    const { product_id } = req.params;

    try {
        // Ownership Check FIRST
        const prodCheck = await pool.query('SELECT seller_id FROM products WHERE product_id = $1', [product_id]);

        if (prodCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const product = prodCheck.rows[0];

        if (req.user.type === 'seller' && product.seller_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this product' });
        }

        const result = await pool.query('DELETE FROM products WHERE product_id = $1 RETURNING *', [product_id]);

        // Log the action
        await logAction(req, 'DELETE_PRODUCT', { product_id, product: result.rows[0] });

        return res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error deleting product' });
    }
}

export const updateVariant = async (req, res) => {
    const { variant_id } = req.params;
    const body = req.body;

    const {
        variant_name, variant_value, price, stock_quantity, sku, weight,
        name, description, brand, category_id, room
    } = body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Ownership Check (Before Update)
        const vCheck = await client.query("SELECT product_id FROM product_variants WHERE variant_id = $1", [variant_id]);
        if (vCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }

        const prodCheck = await client.query("SELECT seller_id FROM products WHERE product_id = $1", [vCheck.rows[0].product_id]);
        if (req.user.type === 'seller' && prodCheck.rows[0]?.seller_id !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'Unauthorized: You do not own the parent product of this variant' });
        }

        // 2. Update the variant record
        const vResult = await client.query(
            `UPDATE product_variants 
             SET name = COALESCE(NULLIF($1, ''), name), 
                 variant_name = COALESCE(NULLIF($2, ''), variant_name), 
                 variant_value = COALESCE(NULLIF($3, ''), variant_value), 
                 price = COALESCE($4, price), 
                 stock_quantity = COALESCE($5, stock_quantity), 
                 sku = COALESCE(NULLIF($6, ''), sku),
                 weight = COALESCE($7, weight)
             WHERE variant_id = $8 RETURNING *`,
            [
                name, 
                variant_name,
                variant_value,
                (price === "" || price === undefined) ? null : price,
                (stock_quantity === "" || stock_quantity === undefined) ? null : stock_quantity,
                sku,
                (weight === "" || weight === undefined) ? null : weight,
                variant_id
            ]
        );

        const variant = vResult.rows[0];

        // 2. Log the action
        await logAction(req, 'UPDATE_VARIANT', { variant_id, product_id: variant.product_id, updates: req.body });

        // 3. Fetch full refreshed product family
        const fullProduct = await client.query(`
            SELECT p.*, 
            (SELECT json_agg(pi.* ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.product_id) as pi_images,
            (SELECT json_agg(pv.*) FROM product_variants pv WHERE pv.product_id = p.product_id) as variants
            FROM products p 
            WHERE p.product_id = $1
        `, [variant.product_id]);

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: 'Variant and base product updated successfully',
            data: fullProduct.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('UPDATE PRODUCT VARIANT FAMILY ERROR:', error);
        return res.status(500).json({ success: false, message: 'Error updating product variant family' });
    } finally {
        client.release();
    }
}

export const searchProducts = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ success: false, message: "Search query is required" });
        }

        const queryText = `
            SELECT p.*, 
            COALESCE((SELECT AVG(rating)::numeric(10,1) FROM reviews WHERE product_id = p.product_id AND variant_id IS NULL), 0) as rating,
            (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id AND variant_id IS NULL) as reviews_count,
            (SELECT json_agg(pi.* ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.product_id) as pi_images,
            (SELECT json_agg(pv.*) FROM product_variants pv WHERE pv.product_id = p.product_id) as variants
            FROM products p 
            WHERE p.is_active = true 
            AND (p.name ILIKE $1 OR p.description ILIKE $1 OR p.brand ILIKE $1)
            ORDER BY p.created_at DESC
        `;
        const result = await pool.query(queryText, [`%${q}%`]);

        return res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error("SEARCH PRODUCTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getAllAdminProducts = async (req, res) => {
    try {
        const query = `
            SELECT p.*, s.store_name as seller_name,
            COALESCE((SELECT AVG(rating)::numeric(10,1) FROM reviews WHERE product_id = p.product_id AND variant_id IS NULL), 0) as rating,
            (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id AND variant_id IS NULL) as reviews_count,
            (SELECT json_agg(pi.* ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.product_id) as pi_images,
            (SELECT json_agg(pv.*) FROM product_variants pv WHERE pv.product_id = p.product_id) as variants
            FROM products p 
            LEFT JOIN sellers s ON p.seller_id = s.seller_id
            WHERE p.deleted_at IS NULL
            ORDER BY p.created_at DESC
        `;
        const result = await pool.query(query);
        return res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error("GET ALL ADMIN PRODUCTS ERROR:", error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getProductStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_products,
                COUNT(*) FILTER (WHERE stock_quantity > 0) as in_stock,
                COUNT(*) FILTER (WHERE stock_quantity = 0) as out_of_stock,
                (SELECT COUNT(*) FROM categories WHERE is_active = true) as total_categories,
                COALESCE(AVG(price), 0) as avg_price
            FROM products
            WHERE deleted_at IS NULL
        `;
        const statsResult = await pool.query(statsQuery);
        return res.status(200).json({ success: true, data: statsResult.rows[0] });
    } catch (error) {
        console.error("GET PRODUCT STATS ERROR:", error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};