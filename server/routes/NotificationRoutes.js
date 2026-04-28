import express from 'express';
import { 
    getCustomerNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
} from '../controllers/NotificationController.js';

import { requireAuth } from '../middlewares/authMiddleware.js';
const router = express.Router();

router.get('/customer/:customerId', requireAuth(['customer', 'admin', 'super_admin']), getCustomerNotifications);
router.patch('/read/:notificationId', requireAuth(['customer', 'seller', 'admin', 'super_admin']), markAsRead);
router.patch('/read-all/customer/:customerId', requireAuth(['customer', 'admin', 'super_admin']), markAllAsRead);
router.delete('/:notificationId', requireAuth(['customer', 'seller', 'admin', 'super_admin']), deleteNotification);

export default router;
