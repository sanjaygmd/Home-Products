import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    withCredentials: true
});

// Add Interceptor to attach tokens
api.interceptors.request.use((config) => {
    try {
        const auth = JSON.parse(localStorage.getItem("auth"));
        const seller = JSON.parse(localStorage.getItem("seller"));
        const directToken = localStorage.getItem("token");

        const token = auth?.token || seller?.token || directToken;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (err) {
        console.error("API Interceptor Error:", err);
    }
    return config;
});