import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    withCredentials: true
});

// Add a request interceptor to attach the correct token as a fallback
api.interceptors.request.use((config) => {
    // 1. Try to find the most specific token based on the request URL
    let token = null;
    const url = config.url || '';

    if (url.includes('/admin/')) {
        token = localStorage.getItem('token'); 
    } else if (url.includes('/seller')) { // Match /seller/ and /seller-onboarding
        const seller = JSON.parse(localStorage.getItem('seller'));
        token = seller?.token;
    } else if (url.includes('/customer')) { // Match /customer/ and /customer-onboarding
        const auth = JSON.parse(localStorage.getItem('auth'));
        token = auth?.token;
    } else {
        // Fallback for general routes
        const auth = JSON.parse(localStorage.getItem('auth'));
        const seller = JSON.parse(localStorage.getItem('seller'));
        token = auth?.token || seller?.token || localStorage.getItem('token');
    }

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});