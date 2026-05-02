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
  verifyOTP,
  getMe
} from '../controllers/AuthController/customerController.js';
import { registerSeller, sellerOnboarding, loginSeller, logoutSeller, getSellerStats, getSellerDashboardData, getSellerOrders, getSellerCustomers, getSellerProfile, updateSellerProfile, getSellerPayments, getSellerFinanceAnalytics, getSellerNotifications, markNotificationRead } from '../controllers/AuthController/sellerController.js';
import { registerAdmin, loginAdmin, verifySuperAdminLogin, logoutAdmin, updateAdminProfile, requestAdminPasswordReset, verifyAdminPasswordReset, getAdminDashboardData, getSellersData, getFinanceData, exportFinanceReport, getAnalyticsData, getAllOrders, bulkUpdateOrders, autoDispatchOrders, getAllCustomers, getAdminProducts, toggleCustomerStatus, toggleSellerStatus, deleteSeller, getAllPayments, getAllReturns, resolveReturnRequest, changeAdminPassword, updateAdminPasswordSelf, updateMasterKey, getAuditLogs, getAllAdministrators, updateAdminStatus, deleteAdministrator } from '../controllers/AuthController/adminController.js';
import { getAdminSettings, updateAdminSettings, getAdminNotifications } from '../controllers/AdminSettingsController.js';
import { getAllReviews, deleteReview, addReview, getProductReviews, checkCanReview, updateReview } from '../controllers/ReviewController.js';
import { verifyToken, requireAuth } from '../middlewares/authMiddleware.js';

const authRoutes = express.Router();

authRoutes.get('/me', verifyToken, getMe);

// Customer Routes
authRoutes.post('/customer/register', registerCustomer);
authRoutes.post('/customer/login', loginCustomer);
authRoutes.post('/customer/logout', logoutCustomer);
authRoutes.post('/customer-onboarding/:id', requireAuth(['customer', 'admin', 'super_admin']), customerOnboarding);
authRoutes.put('/customer/update/:id', requireAuth(['customer', 'admin', 'super_admin']), updateCustomer);
authRoutes.get('/customer/stats/:id', requireAuth(['customer', 'admin', 'super_admin']), getCustomerStats);
authRoutes.get('/customer/orders/:id', requireAuth(['customer', 'admin', 'super_admin']), getCustomerOrders);
authRoutes.get('/customer/addresses/:id', requireAuth(['customer', 'admin', 'super_admin']), getCustomerAddresses);
authRoutes.post('/customer/send-otp', sendOTP);
authRoutes.post('/customer/verify-otp', verifyOTP);
authRoutes.get('/customer/:id', requireAuth(['customer', 'admin', 'super_admin']), getCustomerById);

// Seller Routes
authRoutes.post('/seller/register', registerSeller);
authRoutes.post('/seller/login', loginSeller);
authRoutes.post('/seller/logout', logoutSeller);
authRoutes.post('/seller-onboarding/:id', requireAuth(['seller', 'admin', 'super_admin']), sellerOnboarding);
authRoutes.get('/seller/stats/:id', requireAuth(['seller', 'admin', 'super_admin']), getSellerStats);
authRoutes.get('/seller/dashboard/:id', requireAuth(['seller', 'admin', 'super_admin']), getSellerDashboardData);
authRoutes.get('/seller/orders/:id', requireAuth(['seller', 'admin', 'super_admin']), getSellerOrders);
authRoutes.get('/seller/customers/:id', requireAuth(['seller', 'admin', 'super_admin']), getSellerCustomers);
authRoutes.get('/seller/profile/:id', requireAuth(['seller', 'admin', 'super_admin']), getSellerProfile);
authRoutes.put('/seller/profile/:id', requireAuth(['seller', 'admin', 'super_admin']), updateSellerProfile);
authRoutes.get('/seller/payments/:id', requireAuth(['seller', 'admin', 'super_admin']), getSellerPayments);
authRoutes.get('/seller/finance-analytics/:id', requireAuth(['seller', 'admin', 'super_admin']), getSellerFinanceAnalytics);
authRoutes.post('/seller/send-otp', sendOTP);
authRoutes.post('/seller/verify-otp', verifyOTP);
authRoutes.get('/seller/notifications/:id', requireAuth(['seller', 'admin', 'super_admin']), getSellerNotifications);
authRoutes.patch('/seller/notifications/:notification_id/read', requireAuth(['seller', 'admin', 'super_admin']), markNotificationRead);

// Admin Auth Routes
authRoutes.post('/admin/register', registerAdmin);
authRoutes.post('/admin/login', loginAdmin);
authRoutes.post('/admin/verify-super-admin-login', verifySuperAdminLogin);
authRoutes.post('/admin/request-password-reset', requestAdminPasswordReset);
authRoutes.post('/admin/verify-password-reset', verifyAdminPasswordReset);
authRoutes.post('/admin/logout', logoutAdmin);
authRoutes.get('/admin/dashboard-data', requireAuth(['admin', 'super_admin']), getAdminDashboardData);
authRoutes.get('/admin/sellers-data', requireAuth(['admin', 'super_admin']), getSellersData);
authRoutes.get('/admin/finance-data', requireAuth(['admin', 'super_admin']), getFinanceData);
authRoutes.get('/admin/finance-report', requireAuth(['admin', 'super_admin']), exportFinanceReport);
authRoutes.get('/admin/analytics-data', requireAuth(['admin', 'super_admin']), getAnalyticsData);
authRoutes.get('/admin/orders', requireAuth(['admin', 'super_admin']), getAllOrders);
authRoutes.post('/admin/orders/bulk-update', requireAuth(['admin', 'super_admin']), bulkUpdateOrders);
authRoutes.post('/admin/orders/auto-dispatch', requireAuth(['admin', 'super_admin']), autoDispatchOrders);
authRoutes.get('/admin/customers', requireAuth(['admin', 'super_admin']), getAllCustomers);
authRoutes.get('/admin/products', requireAuth(['admin', 'super_admin']), getAdminProducts);
authRoutes.get('/admin/payments', requireAuth(['admin', 'super_admin']), getAllPayments);
authRoutes.get('/admin/returns', requireAuth(['admin', 'super_admin']), getAllReturns);
authRoutes.post('/admin/returns/:id/resolve', requireAuth(['admin', 'super_admin']), resolveReturnRequest);
authRoutes.patch('/admin/customer/:id/status', requireAuth(['admin', 'super_admin']), toggleCustomerStatus);
authRoutes.patch('/admin/seller/:id/status', requireAuth(['admin', 'super_admin']), toggleSellerStatus);
authRoutes.delete('/admin/seller/:id', requireAuth(['admin', 'super_admin']), deleteSeller);
authRoutes.get('/admin/audit-logs', requireAuth(['admin', 'super_admin']), getAuditLogs);
authRoutes.put('/admin/change-password/:id', requireAuth(['admin', 'super_admin']), changeAdminPassword);
authRoutes.put('/admin/update-password-self', requireAuth(['admin', 'super_admin']), updateAdminPasswordSelf);
authRoutes.put('/admin/profile/:id', requireAuth(['admin', 'super_admin']), updateAdminProfile);

// Super Admin Routes (Admin Management)
authRoutes.get('/super-admin/administrators', requireAuth(['super_admin']), getAllAdministrators);
authRoutes.patch('/super-admin/administrator/:id/status', requireAuth(['super_admin']), updateAdminStatus);
authRoutes.delete('/super-admin/administrator/:id', requireAuth(['super_admin']), deleteAdministrator);
authRoutes.put('/super-admin/master-key', requireAuth(['super_admin']), updateMasterKey);

// Admin Settings & Dynamic Notifications
authRoutes.get('/admin/settings/:adminId', requireAuth(['admin', 'super_admin']), getAdminSettings);
authRoutes.put('/admin/settings/:adminId', requireAuth(['admin', 'super_admin']), updateAdminSettings);
authRoutes.get('/admin/notifications/:adminId', requireAuth(['admin', 'super_admin']), getAdminNotifications);

// Admin Reviews Management
authRoutes.get('/admin/reviews', requireAuth(['admin', 'super_admin']), getAllReviews);
authRoutes.delete('/admin/reviews/:id', requireAuth(['admin', 'super_admin']), deleteReview);

// Customer Reviews
authRoutes.post('/customer/reviews', requireAuth(['customer']), addReview);
authRoutes.get('/reviews/product/:productId', getProductReviews);
authRoutes.get('/customer/can-review/:productId', requireAuth(['customer']), checkCanReview);
authRoutes.put('/customer/reviews/:id', requireAuth(['customer']), updateReview);

export default authRoutes;