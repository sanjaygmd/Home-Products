import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    withCredentials: true
});

// Add a request interceptor to handle any last-minute config needs
api.interceptors.request.use((config) => {
    // We no longer manually attach tokens from localStorage.
    // withCredentials: true ensures that HttpOnly cookies are automatically sent.
    return config;
}, (error) => {
    return Promise.reject(error);
});