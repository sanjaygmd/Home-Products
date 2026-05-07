import express from 'express';
import { 
    getSellerEarningsSummary, 
    getSellerPayoutHistory, 
    getPendingCommissions, 
    initiatePayout,
    requestPayout,
    getAllPayouts,
    updatePayoutStatus
} from '../controllers/PayoutController.js';

import { requireAuth, requireSudo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/summary/:sellerId', requireAuth(['seller', 'admin', 'super_admin']), getSellerEarningsSummary);
router.get('/history/:sellerId', requireAuth(['seller', 'admin', 'super_admin']), getSellerPayoutHistory);
router.get('/pending/:sellerId', requireAuth(['seller', 'admin', 'super_admin']), getPendingCommissions);
router.get('/all', requireAuth(['admin', 'super_admin']), getAllPayouts);
router.post('/request', requireAuth(['seller']), requireSudo, requestPayout);
router.post('/initiate', requireAuth(['admin', 'super_admin']), requireSudo, initiatePayout);
router.patch('/status/:payout_id', requireAuth(['admin', 'super_admin']), updatePayoutStatus);

export default router;
