import { api } from "./api.js";

export const createOrder = async (orderData) => {
    try {
        const response = await api.post(`/orders/create`, orderData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error;
    }
};

export const getMyOrders = async (customerId) => {
    try {
        const response = await api.get(`/orders/customer/${customerId}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error;
    }
};

export const getOrderDetails = async (orderId) => {
    try {
        const response = await api.get(`/orders/order/${orderId}`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error;
    }
};

export const cancelOrder = async (orderId, customerId, reason) => {
    try {
        const response = await api.patch(`/orders/status/${orderId}`, {
            status: 'Cancelled',
            changed_by: customerId,
            notes: reason || 'Order cancelled by customer'
        });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error;
    }
};

export const createReturnRequest = async (returnData) => {
    try {
        const response = await api.post(`/orders/return`, returnData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error;
    }
};
