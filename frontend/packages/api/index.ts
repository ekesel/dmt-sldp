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
    return config;
});

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

export default api;
