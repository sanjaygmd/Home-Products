import express from 'express';
import { createOrder, getMyOrders, getOrderById, updateOrderStatus, createReturnRequest } from '../controllers/OrderController.js';

const orderRoutes = express.Router();

orderRoutes.post('/create', createOrder);
orderRoutes.get('/customer/:customer_id', getMyOrders);
orderRoutes.get('/order/:order_id', getOrderById);
orderRoutes.patch('/status/:order_id', updateOrderStatus);
orderRoutes.post('/return', createReturnRequest);

export default orderRoutes;
