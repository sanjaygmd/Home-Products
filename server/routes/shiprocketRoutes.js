import express from 'express';
import { initiateShipment, syncTracking, getServiceability, handleShiprocketWebhook } from '../controllers/ShipmentController.js';

const router = express.Router();

router.post('/initiate/:orderId', initiateShipment);
router.get('/track/:orderId', syncTracking);
router.get('/get-serviceability/:orderId', getServiceability);
router.post('/webhook', handleShiprocketWebhook);

export default router;
