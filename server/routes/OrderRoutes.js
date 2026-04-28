import express from 'express';
import { createOrder, getMyOrders, getOrderById, updateOrderStatus, createReturnRequest } from '../controllers/OrderController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const orderRoutes = express.Router();

orderRoutes.post('/create', verifyToken, createOrder);
orderRoutes.get('/customer/:customer_id', verifyToken, getMyOrders);
orderRoutes.get('/order/:order_id', verifyToken, getOrderById);
orderRoutes.patch('/status/:order_id', verifyToken, updateOrderStatus);
orderRoutes.post('/return', verifyToken, createReturnRequest);

export default orderRoutes;
