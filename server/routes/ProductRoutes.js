import express from 'express';
import { addProduct, getProducts, getProductsById, getCategories, getProductBySlug, addVariants, updateProduct, deleteProduct, searchProducts, updateVariant, getProductStats, getAllAdminProducts } from '../controllers/ProductController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const productRoutes = express.Router();

// Admin/Seller Routes
productRoutes.post('/add', requireAuth(['seller', 'admin', 'super_admin']), addProduct);
productRoutes.post('/add-variants', requireAuth(['seller', 'admin', 'super_admin']), addVariants);
productRoutes.get('/admin/stats', requireAuth(['admin', 'super_admin']), getProductStats);
productRoutes.get('/admin/all', requireAuth(['admin', 'super_admin']), getAllAdminProducts);

productRoutes.get('/allproducts', getProducts);
productRoutes.get('/categories', getCategories);
productRoutes.get('/search', searchProducts);
productRoutes.get('/slug/:slug', getProductBySlug);
productRoutes.put('/variant/:variant_id', requireAuth(['seller', 'admin', 'super_admin']), updateVariant);
productRoutes.put('/:product_id', requireAuth(['seller', 'admin', 'super_admin']), updateProduct);
productRoutes.delete('/:product_id', requireAuth(['seller', 'admin', 'super_admin']), deleteProduct);
productRoutes.get('/:product_id', getProductsById);

export default productRoutes