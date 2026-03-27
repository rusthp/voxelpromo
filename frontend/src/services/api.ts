import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for dev
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 30000, // 30 seconds - reduced from 120s to fail faster on network issues
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token as string);
        }
    });
    failedQueue = [];
};

// Add a response interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Handle 403 subscription/trial errors — redirect to pricing
        if (error.response?.status === 403) {
            const errCode = error.response.data?.error;
            if (errCode === 'TRIAL_EXPIRED' || errCode === 'SUBSCRIPTION_EXPIRED') {
                if (window.location.pathname !== '/pricing') {
                    window.location.href = '/pricing';
                }
            }
            return Promise.reject(error);
        }

        // Return immediately if it's not a 401 or if it's already a retry of our refresh token request
        if (!error.response || error.response.status !== 401 || originalRequest.url === '/auth/refresh') {
            return Promise.reject(error);
        }

        // It is a 401 and not a retry yet
        if (!originalRequest._retry) {
            const refreshToken = localStorage.getItem('refreshToken');
            
            if (!refreshToken) {
                // No refresh token available, force logout
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // Wait for the current refresh to complete
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Use standard axios to avoid interceptor loop
                const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                const { accessToken, user } = response.data;
                
                // Save new tokens
                localStorage.setItem('token', accessToken);
                if (user) {
                    localStorage.setItem('user', JSON.stringify(user));
                }

                // Update default headers and original request headers
                api.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
                originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;
                
                // Process queued requests
                processQueue(null, accessToken);
                
                // Retry the original request
                return api(originalRequest);
            } catch (err) {
                // Refresh failed (token expired or invalid)
                processQueue(err, null);
                
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }
        
        // Fallback for repeated 401s
        if (originalRequest._retry) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
