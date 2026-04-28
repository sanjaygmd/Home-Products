import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import twilio from 'twilio';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

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
import { fixSellerConstraints } from './migrations/fix_seller_constraints.js';
import { pruneExpiredRecords } from './utils/cleanupTask.js';

const app = express();
const port = process.env.PORT || 5000

app.use(helmet());
app.use(cookieParser());


app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.CLIENT_URL || 'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5174',
            'http://localhost:5000',
            'http://127.0.0.1:5000'
        ];
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const setCookie = res.get('Set-Cookie');
        const entry = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${duration}ms)${setCookie ? ` [Set-Cookie: ${setCookie}]` : ''}\n`;
        try {
            fs.appendFileSync(path.join(process.cwd(), 'debug_requests.log'), entry);
        } catch (e) {}
    });
    next();
});

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
// app.use('/user/customer/login', authLimiter);
// app.use('/user/seller/login', authLimiter);
// app.use('/user/admin/login', authLimiter);
// app.use('/user/customer/send-otp', otpLimiter);
// app.use('/user/seller/send-otp', otpLimiter);
// app.use('/user/customer/verify-otp', otpLimiter); // Protect verification from brute-force
// app.use('/user/seller/verify-otp', otpLimiter);
// app.use('/user/admin/verify-password-reset', otpLimiter);

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

app.get('/', (req, res) => res.send('SERVER IS ALIVE - TASK1'));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("GLOBAL ERROR:", err.stack);
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(status).json({
        success: false,
        message: status === 500 ? "An unexpected error occurred. Please try again later." : message,
        ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
    });
});

app.listen(port, () => {
    console.log(`Server is running on localhost: ${port}`)
})

testDB()
    .then(() => runSystemConfigMigration())
    .then(() => fixSellerConstraints())
    .then(() => pruneExpiredRecords()) // Run cleanup on startup
    .catch((err) => {
        console.log('DB error: ', err)
    })