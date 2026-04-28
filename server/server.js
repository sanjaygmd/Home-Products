import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import twilio from 'twilio';

import { testDB } from './configs/db.js';
import authRoutes from './routes/AuthRoutes.js';
import couponRoutes from './routes/CouponRoutes.js';
import payoutRoutes from './routes/PayoutRoutes.js';
import notificationRoutes from './routes/NotificationRoutes.js';
import pickupRoutes from './routes/PickupRoutes.js';
import productRoutes from './routes/ProductRoutes.js';
import cartRoutes from './routes/CartRoutes.js';
import wishlistRoutes from './routes/WishlistRoutes.js';
import orderRoutes from './routes/OrderRoutes.js';
import shiprocketRoutes from './routes/shiprocketRoutes.js';
import { runMigration as runSystemConfigMigration } from './migrations/systemConfigMigration.js';

const app = express();
const port = process.env.PORT || 5000

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));

// Rate Limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs for auth
    message: { success: false, message: "Too many login attempts, please try again after 15 minutes" }
});

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // limit each IP to 5 OTP requests per 15 minutes
    message: { success: false, message: "Too many OTP requests, please try again after 15 minutes" }
});

// Apply rate limiters to specific routes
app.use('/user/customer/login', authLimiter);
app.use('/user/seller/login', authLimiter);
app.use('/user/admin/login', authLimiter);
app.use('/user/customer/send-otp', otpLimiter);
app.use('/user/seller/send-otp', otpLimiter);

app.use('/user', authRoutes);
app.use('/coupon', couponRoutes);
app.use('/payout', payoutRoutes);
app.use('/notification', notificationRoutes);
app.use('/pickup', pickupRoutes);
app.use('/product', productRoutes);
app.use('/cart', cartRoutes);
app.use('/wishlist', wishlistRoutes);
app.use('/order', orderRoutes);
app.use('/shipping', shiprocketRoutes);

// Removed /schema-test for security

app.get('/', (req, res) => res.send('SERVER IS ALIVE'));

app.listen(port, () => {
    console.log(`Server is running on localhost: ${port}`)
})

testDB()
    .then(() => runSystemConfigMigration())
    .catch((err) => {
        console.log('DB error: ', err)
    })