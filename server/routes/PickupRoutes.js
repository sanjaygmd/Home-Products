import express from 'express';
import { 
    getSellerPickups, 
    addPickupLocation, 
    updatePickupLocation, 
    deletePickupLocation 
} from '../controllers/PickupController.js';

import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/seller/:sellerId', requireAuth(['seller', 'admin', 'super_admin']), getSellerPickups);
router.post('/add', requireAuth(['seller', 'admin', 'super_admin']), addPickupLocation);
router.patch('/update/:pickupId', requireAuth(['seller', 'admin', 'super_admin']), updatePickupLocation);
router.delete('/:pickupId', requireAuth(['seller', 'admin', 'super_admin']), deletePickupLocation);

export default router;
