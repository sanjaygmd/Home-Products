import express from 'express';
import { createOrder, getMyOrders, getOrderById, updateOrderStatus, createReturnRequest } from '../controllers/OrderController.js';
import { verifyToken, requireAuth } from '../middlewares/authMiddleware.js';

const orderRoutes = express.Router();

orderRoutes.post('/create', requireAuth(['customer']), createOrder);
orderRoutes.get('/customer/:customer_id', requireAuth(['customer', 'admin', 'super_admin']), getMyOrders);
orderRoutes.get('/order/:order_id', requireAuth(['customer', 'seller', 'admin', 'super_admin']), getOrderById);
orderRoutes.patch('/status/:order_id', requireAuth(['seller', 'admin', 'super_admin']), updateOrderStatus);
orderRoutes.post('/return', requireAuth(['customer']), createReturnRequest);

export default orderRoutes;
