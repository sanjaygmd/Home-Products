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

const router = express.Router();

router.get('/summary/:sellerId', getSellerEarningsSummary);
router.get('/history/:sellerId', getSellerPayoutHistory);
router.get('/pending/:sellerId', getPendingCommissions);
router.get('/all', getAllPayouts);
router.post('/request', requestPayout);
router.post('/initiate', initiatePayout);
router.patch('/status/:payout_id', updatePayoutStatus);

export default router;
