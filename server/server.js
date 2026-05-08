import dotenv from 'dotenv';
dotenv.config();

// Critical Environment Validations
const requiredEnvVars = ['JWT_SECRET', 'MASTER_SECURITY_KEY', 'NODE_ENV', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
  console.error("========================================================================");
  console.error("  FATAL CONFIGURATION ERROR: Required environment variables are missing!");
  console.error("========================================================================");
  missingEnvVars.forEach(v => console.error(`  [MISSING]: ${v}`));
  console.error("");
  console.error("  Helpful Guide:");
  console.error("  1. Copy '.env.example' template to '.env' in your server folder.");
  console.error("  2. Populate the placeholder values with your real configuration details.");
  console.error("  3. Restart the server node process.");
  console.error("========================================================================");
  process.exit(1);
}

import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { testDB } from './configs/db.js';
import { runSchemaMigrations } from './configs/migrations.js';
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
app.set('trust proxy', 1);
const port = process.env.PORT || 5000

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
00000000            "img-src": ["'self'", "data:", "https://*.amazonaws.com", "https://via.placeholder.com", "https://images.unsplash.com"],
        },
    },
}));
app.use(cookieParser());


app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.CLIENT_URL || 'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5174'
        ];
        // Only allow undefined origin (non-browser requests) in development
        const isAllowed = allowedOrigins.indexOf(origin) !== -1 || (origin === undefined && process.env.NODE_ENV === 'development');
        
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Request Logger (Development only - Async with log rotation at 5MB)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            const entry = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${duration}ms)\n`;
            const logPath = path.join(process.cwd(), 'debug_requests.log');
            
            // Perform async append to never block event loop
            fs.appendFile(logPath, entry, (err) => {
                if (err) return;
                
                // Stat check asynchronously for log rotation
                fs.stat(logPath, (err, stats) => {
                    if (!err && stats.size > 5 * 1024 * 1024) {
                        const backupPath = path.join(process.cwd(), 'debug_requests.log.old');
                        fs.rename(logPath, backupPath, () => {});
                    }
                });
            });
        });
        next();
    });
}

// Global API Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
    message: { success: false, message: "Too many requests from this IP, please try again after 15 minutes." }
});

// Apply global rate limiting before routing
app.use(apiLimiter);

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

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 registrations per hour
    message: { success: false, message: "Too many registration attempts from this IP, please try again after an hour." }
});

// Apply rate limiters to specific routes
app.use('/user/customer/register', registerLimiter);
app.use('/user/seller/register', registerLimiter);
app.use('/user/admin/register', registerLimiter);
app.use('/user/admin/reset-password-via-link', authLimiter);
app.use('/user/customer/login', authLimiter);
app.use('/user/seller/login', authLimiter);
app.use('/user/admin/login', authLimiter);
app.use('/user/admin/verify-super-admin-login', authLimiter);
app.use('/user/customer/send-otp', otpLimiter);
app.use('/user/seller/send-otp', otpLimiter);
app.use('/user/customer/verify-otp', otpLimiter); // Protect verification from brute-force
app.use('/user/seller/verify-otp', otpLimiter);
app.use('/user/admin/verify-password-reset', otpLimiter);

app.use('/user', authRoutes);
app.use('/coupon', couponRoutes);
app.use('/payout', payoutRoutes);
app.use('/notification', notificationRoutes);
app.use('/pickup', pickupRoutes);
app.use('/product', productRoutes);
app.use('/cart', cartRoutes);
app.use('/wishlist', wishlistRoutes);
app.use('/orders', orderRoutes);
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
    .then(() => runSchemaMigrations()) // Run decoupled schema migrations
    .then(() => pruneExpiredRecords()) // Safe, idempotent cleanup on startup
    .catch((err) => {
        console.error('Database initialization error: ', err)
    })