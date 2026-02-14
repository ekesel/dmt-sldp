import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
});

// Interceptor for multi-tenancy
api.interceptors.request.use((config) => {
    const tenant = typeof window !== 'undefined' ? localStorage.getItem('dmt-tenant') : null;
    if (tenant) {
        config.headers['X-Tenant'] = tenant;
    }
    
    // Add JWT token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('dmt-access-token') : null;
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
});

// Interceptor for handling token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('dmt-refresh-token') : null;
                if (refreshToken) {
                    const response = await api.post('/auth/token/refresh/', { refresh: refreshToken });
                    const { access } = response.data;
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('dmt-access-token', access);
                    }
                    originalRequest.headers['Authorization'] = `Bearer ${access}`;
                    return api(originalRequest);
                }
            } catch (err) {
                // Refresh failed, redirect to login
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('dmt-access-token');
                    localStorage.removeItem('dmt-refresh-token');
                    window.location.href = '/auth/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export const auth = {
    register: (data: { username: string; email: string; password: string; password2: string; first_name?: string; last_name?: string }) =>
        api.post('/auth/register/', data).then(res => res.data),
    login: (username: string, password: string) =>
        api.post('/auth/token/', { username, password }).then(res => res.data),
    refreshToken: (refresh: string) =>
        api.post('/auth/token/refresh/', { refresh }).then(res => res.data),
    getProfile: () =>
        api.get('/auth/profile/').then(res => res.data),
    logout: () =>
        api.post('/auth/logout/').then(res => res.data),
};

export const tenants = {
    list: () => api.get('/admin/tenants/').then(res => res.data),
    create: (data: any) => api.post('/admin/tenants/', data).then(res => res.data),
};

export const projects = {
    list: () => api.get('/admin/projects/').then(res => res.data),
    get: (id: string) => api.get(`/admin/projects/${id}/`).then(res => res.data),
};

export const sources = {
    list: (projectId: string) => api.get(`/admin/sources/?project=${projectId}`).then(res => res.data),
    discover: (sourceId: string) => api.post(`/admin/sources/${sourceId}/discover/`).then(res => res.data),
    sync: (sourceId: string) => api.post(`/admin/sources/${sourceId}/sync/`).then(res => res.data),
};

export const health = {
    get: () => api.get('/admin/health/').then(res => res.data),
};

export const dashboard = {
    getMetrics: () => api.get('/analytics/metrics/').then(res => res.data),
    getForecast: (integrationId: string, remainingItems: number = 10) =>
        api.get(`/analytics/forecast/?integration_id=${integrationId}&remaining_items=${remainingItems}`).then(res => res.data),
    updateInsightFeedback: (insightId: number, suggestionId: string, status: 'accepted' | 'rejected') =>
        api.patch('/analytics/insights/feedback/', { insight_id: insightId, suggestion_id: suggestionId, status }).then(res => res.data),
};

export default api;
