import { api } from './api';

export const getSellerStats = async (sellerId) => {
  try {
    const res = await api.get(`/user/seller/stats/${sellerId}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to fetch stats' };
  }
};

export const getSellerDashboardData = async (sellerId) => {
  try {
    const res = await api.get(`/user/seller/dashboard/${sellerId}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to fetch dashboard data' };
  }
};

export const getSellerOrders = async (sellerId) => {
  try {
    const res = await api.get(`/user/seller/orders/${sellerId}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to fetch orders' };
  }
};

export const getSellerCustomers = async (sellerId) => {
  try {
    const res = await api.get(`/user/seller/customers/${sellerId}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to fetch customers' };
  }
};

export const getSellerProfile = async (sellerId) => {
  try {
    const res = await api.get(`/user/seller/profile/${sellerId}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to fetch profile' };
  }
};

export const updateSellerProfile = async (sellerId, data) => {
  try {
    const res = await api.put(`/user/seller/profile/${sellerId}`, data);
    return res.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to update profile' };
  }
};

export const getSellerPayments = async (sellerId) => {
  try {
    const res = await api.get(`/user/seller/payments/${sellerId}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to fetch payments' };
  }
};

export const getSellerFinanceAnalytics = async (sellerId) => {
  try {
    const res = await api.get(`/user/seller/finance-analytics/${sellerId}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to fetch finance analytics' };
  }
};
export const getOrderDetails = async (orderId) => {
  try {
    const res = await api.get(`/order/order/${orderId}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to fetch order details' };
  }
};

export const updateOrderStatus = async (orderId, data) => {
  try {
    const res = await api.patch(`/order/status/${orderId}`, data);
    return res.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to update order status' };
  }
};

export const getSellerNotifications = async (sellerId) => {
  try {
    const res = await api.get(`/user/seller/notifications/${sellerId}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to fetch notifications' };
  }
};

export const markNotificationRead = async (notificationId) => {
  try {
    const res = await api.patch(`/user/seller/notifications/${notificationId}/read`);
    return res.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to mark notification as read' };
  }
};
