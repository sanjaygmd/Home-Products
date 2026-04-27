import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
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

const app = express();
const port = process.env.PORT || 5000

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));

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

import { pool } from './configs/db.js';
app.get('/schema-test', async (req, res) => {
    try {
        const result = await pool.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('return_requests', 'reverse_shipments', 'deliveries', 'returns') ORDER BY table_name, ordinal_position;");
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/', (req, res) => res.send('SERVER IS ALIVE'));

app.listen(port, () => {
    console.log(`Server is running on localhost: ${port}`)
})

testDB()
    .catch((err) => {
        console.log('DB error: ', err)
    })