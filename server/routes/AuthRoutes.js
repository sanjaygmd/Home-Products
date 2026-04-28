import { pool } from '../configs/db.js';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import {
  customerOnboarding,
  getCustomerById,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  updateCustomer,
  getCustomerStats,
  getCustomerOrders,
  getCustomerAddresses,
  sendOTP,
  verifyOTP
} from '../controllers/AuthController/customerController.js';
import { registerSeller, sellerOnboarding, loginSeller, logoutSeller, getSellerStats, getSellerDashboardData, getSellerOrders, getSellerCustomers, getSellerProfile, updateSellerProfile, getSellerPayments, getSellerFinanceAnalytics, getSellerNotifications, markNotificationRead } from '../controllers/AuthController/sellerController.js';
import { registerAdmin, loginAdmin, verifySuperAdminLogin, logoutAdmin, requestAdminPasswordReset, verifyAdminPasswordReset, getAdminDashboardData, getSellersData, getFinanceData, exportFinanceReport, getAnalyticsData, getAllOrders, bulkUpdateOrders, autoDispatchOrders, getAllCustomers, getAdminProducts, toggleCustomerStatus, toggleSellerStatus, getAllPayments, getAllReturns, resolveReturnRequest, changeAdminPassword, updateAdminPasswordSelf, updateMasterKey, getAuditLogs, getAllAdministrators, updateAdminStatus, deleteAdministrator } from '../controllers/AuthController/adminController.js';
import { getAdminSettings, updateAdminSettings, getAdminNotifications } from '../controllers/AdminSettingsController.js';
import { getAllReviews, deleteReview, addReview, getProductReviews, checkCanReview, updateReview } from '../controllers/ReviewController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const authRoutes = express.Router();

// Customer Routes
authRoutes.post('/customer/register', registerCustomer);
authRoutes.post('/customer/login', loginCustomer);
authRoutes.post('/customer/logout', logoutCustomer);
authRoutes.post('/customer-onboarding/:id', verifyToken, customerOnboarding);
authRoutes.put('/customer/update/:id', verifyToken, updateCustomer);
authRoutes.get('/customer/stats/:id', verifyToken, getCustomerStats);
authRoutes.get('/customer/orders/:id', verifyToken, getCustomerOrders);
authRoutes.get('/customer/addresses/:id', verifyToken, getCustomerAddresses);
authRoutes.post('/customer/send-otp', sendOTP);
authRoutes.post('/customer/verify-otp', verifyOTP);
authRoutes.get('/customer/:id', verifyToken, getCustomerById);

// Seller Routes
authRoutes.post('/seller/register', registerSeller);
authRoutes.post('/seller/login', loginSeller);
authRoutes.post('/seller/logout', logoutSeller);
authRoutes.post('/seller-onboarding/:id', verifyToken, sellerOnboarding);
authRoutes.get('/seller/stats/:id', verifyToken, getSellerStats);
authRoutes.get('/seller/dashboard/:id', verifyToken, getSellerDashboardData);
authRoutes.get('/seller/orders/:id', verifyToken, getSellerOrders);
authRoutes.get('/seller/customers/:id', verifyToken, getSellerCustomers);
authRoutes.get('/seller/profile/:id', verifyToken, getSellerProfile);
authRoutes.put('/seller/profile/:id', verifyToken, updateSellerProfile);
authRoutes.get('/seller/payments/:id', verifyToken, getSellerPayments);
authRoutes.get('/seller/finance-analytics/:id', verifyToken, getSellerFinanceAnalytics);
authRoutes.post('/seller/send-otp', sendOTP);
authRoutes.post('/seller/verify-otp', verifyOTP);
authRoutes.get('/seller/notifications/:id', verifyToken, getSellerNotifications);
authRoutes.patch('/seller/notifications/:notification_id/read', verifyToken, markNotificationRead);

// Admin Auth Routes
authRoutes.post('/admin/register', registerAdmin);
authRoutes.post('/admin/login', loginAdmin);
authRoutes.post('/admin/verify-super-admin-login', verifySuperAdminLogin);
authRoutes.post('/admin/request-password-reset', requestAdminPasswordReset);
authRoutes.post('/admin/verify-password-reset', verifyAdminPasswordReset);
authRoutes.post('/admin/logout', logoutAdmin);
authRoutes.get('/admin/dashboard-data', verifyToken, getAdminDashboardData);
authRoutes.get('/admin/sellers-data', verifyToken, getSellersData);
authRoutes.get('/admin/finance-data', verifyToken, getFinanceData);
authRoutes.get('/admin/finance-report', verifyToken, exportFinanceReport);
authRoutes.get('/admin/analytics-data', verifyToken, getAnalyticsData);
authRoutes.get('/admin/orders', verifyToken, getAllOrders);
authRoutes.post('/admin/orders/bulk-update', verifyToken, bulkUpdateOrders);
authRoutes.post('/admin/orders/auto-dispatch', verifyToken, autoDispatchOrders);
authRoutes.get('/admin/customers', verifyToken, getAllCustomers);
authRoutes.get('/admin/products', verifyToken, getAdminProducts);
authRoutes.get('/admin/payments', verifyToken, getAllPayments);
authRoutes.get('/admin/returns', verifyToken, getAllReturns);
authRoutes.post('/admin/returns/:id/resolve', verifyToken, resolveReturnRequest);
authRoutes.patch('/admin/customer/:id/status', verifyToken, toggleCustomerStatus);
authRoutes.patch('/admin/seller/:id/status', verifyToken, toggleSellerStatus);
authRoutes.get('/admin/audit-logs', verifyToken, getAuditLogs);
authRoutes.put('/admin/change-password/:id', verifyToken, changeAdminPassword);
authRoutes.put('/admin/update-password-self', verifyToken, updateAdminPasswordSelf);

// Super Admin Routes (Admin Management)
authRoutes.get('/super-admin/administrators', verifyToken, getAllAdministrators);
authRoutes.patch('/super-admin/administrator/:id/status', verifyToken, updateAdminStatus);
authRoutes.delete('/super-admin/administrator/:id', verifyToken, deleteAdministrator);
authRoutes.put('/super-admin/master-key', verifyToken, updateMasterKey);

// Admin Settings & Dynamic Notifications
authRoutes.get('/admin/settings/:adminId', verifyToken, getAdminSettings);
authRoutes.put('/admin/settings/:adminId', verifyToken, updateAdminSettings);
authRoutes.get('/admin/notifications/:adminId', verifyToken, getAdminNotifications);

// Admin Reviews Management
authRoutes.get('/admin/reviews', verifyToken, getAllReviews);
authRoutes.delete('/admin/reviews/:id', verifyToken, deleteReview);

// Customer Reviews
authRoutes.post('/customer/reviews', verifyToken, addReview);
authRoutes.get('/reviews/product/:productId', getProductReviews);
authRoutes.get('/customer/can-review/:productId', verifyToken, checkCanReview);
authRoutes.put('/customer/reviews/:id', verifyToken, updateReview);

export default authRoutes;