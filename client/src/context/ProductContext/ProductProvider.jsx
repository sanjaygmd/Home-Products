import { useState, useEffect, useCallback, useContext } from "react"
import { ProductContext } from "./ProductContext";
export { ProductContext };
import * as productService from "../../services/productService";

export const ProductProvider = ({ children }) => {
    const [products, setProducts] = useState([]);
    const [sellerProducts, setSellerProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const mapProduct = (p) => {
        const mrp = Number(p.mrp) || 0;
        const price = Number(p.price) || 0;
        
        // Sort all images from table
        const dbImages = p.pi_images ? p.pi_images.sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)) : [];
        const mainImages = dbImages.filter(img => !img.variant_id).map(img => img.image_url);
        
        // Fallback to images array if no main images in table
        if (mainImages.length === 0 && Array.isArray(p.images) && p.images.length > 0) {
            mainImages.push(...p.images);
        }
        if (mainImages.length === 0) mainImages.push("https://via.placeholder.com/400");

        const finalImages = mainImages;

        return {
            ...p,
            id: p.product_id,
            // Base prices
            basePrice: mrp > 0 ? mrp : price,
            baseDiscountPrice: price,
            // Legacy/Display prices
            price: mrp > 0 ? mrp : price,
            discountPrice: price,
            discountPercent: ((mrp > 0 && mrp > price) ? Math.round(((mrp - price) / mrp) * 100) : (p.discount_percent || 0)),
            reviewsCount: Number(p.reviews_count) || 0,
            rating: Number(p.rating) || 0,
            thumbnail: finalImages[0],
            images: finalImages,
            mainImages: mainImages,
            rawImages: dbImages,
            // Variants
            variants: p.variants || [],
            variantGroups: p.variants ? p.variants.reduce((acc, v) => {
              (acc[v.variant_name] = acc[v.variant_name] || []).push(v);
              return acc;
            }, {}) : {},
            displayVariants: p.variants || [],
            colorVariants: p.variants ? p.variants.filter(v => v.variant_name.toLowerCase() === 'color') : [],
            stock: p.stock_quantity || 0,
            status: p.is_active ? "Active" : "Inactive",
            group: p.category_id,
            room: p.room || "your home",
            color: p.color
        };
    };

    const fetchProducts = useCallback(async (sellerId = null) => {
        setLoading(true);
        try {
            const res = await productService.getProducts(sellerId);
            if (res.success) {
                const allProducts = [];
                res.data.forEach(p => {
                    const base = mapProduct(p);
                    // Add base product
                    allProducts.push(base);
                    
                    // Add each variant as a separate product entry
                    if (p.variants && p.variants.length > 0) {
                        p.variants.forEach(v => {
                            // Find specific images for this variant
                            const variantImg = base.rawImages.find(img => img.variant_id === v.variant_id);
                            
                            const vPrice = Number(v.price) || base.price;
                            const vMrp = base.basePrice || vPrice;
                            const vDiscountPercent = (vMrp > 0 && vMrp > vPrice) 
                                ? Math.round(((vMrp - vPrice) / vMrp) * 100) 
                                : 0;

                            allProducts.push({
                                ...base,
                                id: `${p.product_id}-${v.variant_id}`,
                                isVariant: true,
                                variantId: v.variant_id,
                                name: v.name || p.name,
                                variant_name: v.variant_name,
                                variant_value: v.variant_value,
                                price: vPrice,
                                discountPrice: vPrice,
                                discountPercent: vDiscountPercent,
                                stock: Number(v.stock_quantity) || 0,
                                thumbnail: variantImg ? variantImg.image_url : base.thumbnail,
                                slug: `${base.slug}?v=${v.variant_id}`
                            });
                        });
                    }
                });
                setProducts(allProducts);
            }
        } catch (err) {
            console.error("Fetch products failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const expandProductFamily = (p) => {
        if (!p) return [];
        const base = mapProduct(p);
        const family = [base];
        
        if (p.variants && p.variants.length > 0) {
            p.variants.forEach(v => {
                const variantImg = base.rawImages.find(img => img.variant_id === v.variant_id);
                const vPrice = Number(v.price) || base.price;
                const vMrp = base.basePrice || vPrice;
                const vDiscountPercent = (vMrp > 0 && vMrp > vPrice) 
                    ? Math.round(((vMrp - vPrice) / vMrp) * 100) 
                    : 0;
                family.push({
                    ...base,
                    id: `${p.product_id}-${v.variant_id}`,
                    isVariant: true,
                    variantId: v.variant_id,
                    name: v.name || p.name,
                    variant_name: v.variant_name,
                    variant_value: v.variant_value,
                    price: vPrice,
                    discountPrice: vPrice,
                    discountPercent: vDiscountPercent,
                    stock: Number(v.stock_quantity) || 0,
                    thumbnail: variantImg ? variantImg.image_url : base.thumbnail,
                    slug: `${base.slug}?v=${v.variant_id}`
                });
            });
        }
        return family;
    };

    const addProduct = async (productData) => {
        const res = await productService.addProduct(productData);
        if (res.success) {
            const family = expandProductFamily(res.data);
            const updateState = (prev) => [...prev, ...family].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setProducts(updateState);
            setSellerProducts(updateState);
        }
        return res;
    }

    const updateProduct = async (id, productData) => {
        const res = await productService.updateProduct(id, productData);
        if (res.success) {
            const family = expandProductFamily(res.data);
            const baseId = res.data.product_id;
            
            const updateState = (prev) => {
                const filtered = prev.filter(p => p.product_id !== baseId && p.id !== baseId);
                return [...filtered, ...family].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            };

            setProducts(updateState);
            setSellerProducts(updateState);
        }
        return res;
    }

    const updateVariant = async (id, variantData) => {
        const res = await productService.updateVariant(id, variantData);
        if (res.success) {
            const family = expandProductFamily(res.data);
            const baseId = res.data.product_id;

            const updateState = (prev) => {
                const filtered = prev.filter(p => p.product_id !== baseId && p.id !== baseId);
                return [...filtered, ...family].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            };

            setProducts(updateState);
            setSellerProducts(updateState);
        }
        return res;
    }

    const deleteProduct = async (id) => {
        const res = await productService.deleteProduct(id);
        if (res.success) {
            setProducts(prev => prev.filter(p => p.id !== id));
            setSellerProducts(prev => prev.filter(p => p.id !== id));
        }
        return res;
    }

    const fetchSellerProducts = useCallback(async (sellerId) => {
        if (!sellerId) return;
        setLoading(true);
        try {
            const res = await productService.getProducts(sellerId);
            if (res.success) {
                const mapped = [];
                res.data.forEach(p => {
                    const base = mapProduct(p);
                    mapped.push(base);
                    if (p.variants && p.variants.length > 0) {
                        p.variants.forEach(v => {
                            const variantImg = base.rawImages.find(img => img.variant_id === v.variant_id);
                            const vPrice = Number(v.price) || base.price;
                            const vMrp = base.basePrice || vPrice;
                            const vDiscountPercent = (vMrp > 0 && vMrp > vPrice) 
                                ? Math.round(((vMrp - vPrice) / vMrp) * 100) 
                                : 0;

                            mapped.push({
                                ...base,
                                id: `${p.product_id}-${v.variant_id}`,
                                isVariant: true,
                                variantId: v.variant_id,
                                name: v.name || p.name,
                                variant_name: v.variant_name,
                                variant_value: v.variant_value,
                                price: vPrice,
                                discountPrice: vPrice,
                                discountPercent: vDiscountPercent,
                                stock: Number(v.stock_quantity) || 0,
                                thumbnail: variantImg ? variantImg.image_url : base.thumbnail,
                                slug: `${base.slug}?v=${v.variant_id}`
                            });
                        });
                    }
                });
                setSellerProducts(mapped);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const updateProductRating = (productId, newRating, newCount, variantId = null) => {
        const updater = (prev) => prev.map(p => {
            // If we have a variantId, only update that specific variant card
            if (variantId) {
                // Check if this card represents the specific variant
                if (p.variantId === variantId || p.variant_id === variantId) {
                    return { ...p, rating: Number(newRating) || 0, reviewsCount: Number(newCount) || 0 };
                }
            } else {
                // If NO variantId is provided, we are updating the BASE product
                // We must be careful NOT to update variant cards that happen to have the same product_id
                if ((p.product_id === productId || p.id === productId) && !p.isVariant) {
                    return { ...p, rating: Number(newRating) || 0, reviewsCount: Number(newCount) || 0 };
                }
            }
            return p;
        });
        setProducts(updater);
        setSellerProducts(updater);
    };


    return (
        <ProductContext.Provider value={{ 
            products, 
            sellerProducts, 
            addProduct, 
            updateProduct, 
            updateVariant,
            deleteProduct, 
            loading, 
            fetchProducts, 
            fetchSellerProducts,
            updateProductRating
        }}>
            {children}
        </ProductContext.Provider>
    )
}

export const useProducts = () => {
    const context = useContext(ProductContext);
    if (!context) {
        throw new Error("useProducts must be used within a ProductProvider");
    }
    return context;
};