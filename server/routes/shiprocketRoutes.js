import express from 'express';
import { initiateShipment, syncTracking, getServiceability, handleShiprocketWebhook } from '../controllers/ShipmentController.js';

import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/initiate/:orderId', requireAuth(['seller', 'admin', 'super_admin']), initiateShipment);
router.get('/track/:orderId', requireAuth(['seller', 'customer', 'admin', 'super_admin']), syncTracking);
router.get('/get-serviceability/:orderId', requireAuth(['seller', 'customer', 'admin', 'super_admin']), getServiceability);
router.post('/webhook', handleShiprocketWebhook); // External webhook

export default router;
