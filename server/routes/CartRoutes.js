import express from 'express';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../controllers/CartController.js';

import { requireAuth } from '../middlewares/authMiddleware.js';

const cartRoutes = express.Router();

cartRoutes.get('/:customer_id', requireAuth(['customer', 'admin', 'super_admin']), getCart);
cartRoutes.post('/add', requireAuth(['customer']), addToCart);
cartRoutes.patch('/update', requireAuth(['customer']), updateCartItem);
cartRoutes.delete('/remove/:cart_item_id', requireAuth(['customer']), removeFromCart);
cartRoutes.delete('/clear/:customer_id', requireAuth(['customer', 'admin', 'super_admin']), clearCart);

export default cartRoutes;
