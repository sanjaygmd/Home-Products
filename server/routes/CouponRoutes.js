import express from 'express';
import { getActiveCoupons, validateCoupon, getAllCoupons, createCoupon, updateCoupon, deleteCoupon } from '../controllers/CouponController.js';

import { verifyToken, requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/active', verifyToken, getActiveCoupons);
router.post('/validate', verifyToken, validateCoupon);
router.get('/all', requireAuth(['admin', 'super_admin']), getAllCoupons);
router.post('/create', requireAuth(['admin', 'super_admin']), createCoupon);
router.put('/update/:id', requireAuth(['admin', 'super_admin']), updateCoupon);
router.delete('/delete/:id', requireAuth(['admin', 'super_admin']), deleteCoupon);

export default router;
