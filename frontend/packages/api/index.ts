import axios, { AxiosError } from 'axios';
import { getCache, setCache } from './cache';
import { deduplicateRequest } from './deduplication';

/* =========================
   Axios Instance
========================= */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
});

// Add JWT token if available
api.interceptors.request.use((config) => {
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
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken =
          typeof window !== 'undefined' ? localStorage.getItem('dmt-refresh-token') : null;
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
    if (error.response) {
      // Handle 403 (Forbidden) and 5xx (Server Errors) via global handler
      if (error.response.status === 403 || error.response.status >= 500) {
        if (globalErrorHandler) {
          globalErrorHandler(error);
        }
      }
    }
    return Promise.reject(error);
  }
);

let globalErrorHandler: ((error: any) => void) | null = null;

export const setGlobalErrorHandler = (handler: (error: any) => void) => {
  globalErrorHandler = handler;
};

/* =========================
   Shared Types / Helpers
========================= */

export interface ApiErrorPayload {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

export class ApiClientError extends Error {
  status?: number;
  data?: ApiErrorPayload | unknown;

  constructor(message: string, status?: number, data?: ApiErrorPayload | unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<ApiErrorPayload>;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    const message =
      data?.detail ||
      data?.message ||
      axiosErr.message ||
      'An unexpected API error occurred';
    throw new ApiClientError(message, status, data);
  }
  throw error instanceof Error ? error : new ApiClientError('Unknown API error');
}

interface RequestConfig {
  cache?: boolean;
  ttl?: number;
  deduplicate?: boolean;
}

async function get<T>(url: string, params?: Record<string, unknown>, config?: RequestConfig): Promise<T> {
  const cacheKey = config?.cache || config?.deduplicate ? `${url}?${JSON.stringify(params || {})}` : null;

  // 1. Check Cache
  if (config?.cache && cacheKey) {
    const cached = getCache<T>(cacheKey);
    if (cached) return cached;
  }

  const performRequest = async () => {
    try {
      const res = await api.get<T>(url, { params });
      return res.data;
    } catch (error) {
      handleApiError(error);
      throw error; // handleApiError throws, but just in case
    }
  };

  try {
    let result: T;

    // 2. Deduplication or Direct Call
    if (config?.deduplicate !== false && cacheKey) { // Default to deduplication if key exists? No, let's be explicit or default true for GET?
      // Let's only deduplicate if explicitly asked OR if caching is on (implies read-only)
      if (config?.deduplicate || config?.cache) {
        result = await deduplicateRequest(cacheKey, performRequest);
      } else {
        result = await performRequest();
      }
    } else {
      result = await performRequest();
    }

    // 3. Set Cache
    if (config?.cache && cacheKey) {
      setCache(cacheKey, result, config.ttl);
    }

    return result;
  } catch (error) {
    throw error; // Already handled by handleApiError inside performRequest? 
    // handleApiError throws ApiClientError.
    // We need to ensure we don't swallow it.
  }
}

async function post<TResponse, TBody = unknown>(url: string, body?: TBody): Promise<TResponse> {
  try {
    const res = await api.post<TResponse>(url, body);
    return res.data;
  } catch (error) {
    handleApiError(error);
  }
}

async function patch<TResponse, TBody = unknown>(url: string, body?: TBody): Promise<TResponse> {
  try {
    const res = await api.patch<TResponse>(url, body);
    return res.data;
  } catch (error) {
    handleApiError(error);
  }
}

async function del<TResponse = void>(url: string): Promise<TResponse> {
  try {
    const res = await api.delete<TResponse>(url);
    return res.data;
  } catch (error) {
    handleApiError(error);
  }
}

/* =========================
   Existing Modules
========================= */

export interface AuthRegisterPayload {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthTokenResponse {
  access: string;
  refresh: string;
  user: any;
}

export interface AuthRefreshResponse {
  access: string;
}

export interface UserProfile {
  id: string | number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

export const auth = {
  register: (data: AuthRegisterPayload) => post<UserProfile, AuthRegisterPayload>('/auth/register/', data),
  login: (username: string, password: string, portal?: string) =>
    post<AuthTokenResponse, { username: string; password: string; portal?: string }>('/auth/token/', { username, password, portal }),
  refreshToken: (refresh: string) =>
    post<AuthRefreshResponse, { refresh: string }>('/auth/token/refresh/', { refresh }),
  getProfile: () => get<any>('/auth/profile/'),
  logout: () => post<{ success?: boolean; detail?: string }>('/auth/logout/'),
};

export interface Tenant {
  id: string | number;
  name: string;
  slug?: string;
  [key: string]: unknown;
}

export const tenants = {
  list: () => get<Tenant[]>('/admin/tenants/', {}, { cache: true, ttl: 60000 }), // Cache 1 min
  get: (id: string | number) => get<Tenant>(`/admin/tenants/${id}/`, {}, { cache: true, ttl: 60000 }),
  create: (data: Partial<Tenant>) => post<Tenant, Partial<Tenant>>('/admin/tenants/', data),
  update: (id: string | number, data: Partial<Tenant>) => patch<Tenant, Partial<Tenant>>(`/admin/tenants/${id}/`, data),
  delete: (id: string | number) => del<{ success?: boolean; detail?: string }>(`/admin/tenants/${id}/`),
  activate: (id: string | number) => post<{ success?: boolean }>(`/admin/tenants/${id}/activate/`),
  deactivate: (id: string | number) => post<{ success?: boolean }>(`/admin/tenants/${id}/deactivate/`),
  archiveData: (id: string | number) => post<{ status: string }>(`/admin/tenants/${id}/archive-data/`),
};

export interface Project {
  id: string | number;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export const projects = {
  list: () => get<Project[]>('/admin/projects/', {}, { cache: true, ttl: 30000 }), // Cache 30s
  get: (id: string) => get<Project>(`/admin/projects/${id}/`, {}, { cache: true }),
};

export interface Source {
  id: string | number;
  project?: string | number;
  name?: string;
  type?: string;
  [key: string]: unknown;
}

export const sources = {
  list: (projectId: string | number) => get<Source[]>('/admin/sources/', { project_id: projectId }),
  discover: (sourceId: string | number) => post<{ detail?: string }>(`/admin/sources/${sourceId}/discover/`),
  sync: (sourceId: string | number) => post<{ detail?: string }>(`/admin/sources/${sourceId}/sync/`),
  testConnection: (sourceId: string | number) => post<{ status: string; message: string }>(`/admin/sources/${sourceId}/test_connection/`),
  triggerSync: (sourceId: string | number) => post<{ status: string; message: string; task_id?: string }>(`/admin/sources/${sourceId}/trigger_sync/`),
  delete: (sourceId: string | number) => del<{ success?: boolean; detail?: string }>(`/admin/sources/${sourceId}/`),
  create: (data: any) => post<Source, any>('/admin/sources/', data),
  update: (sourceId: string | number, data: any) => patch<Source, any>(`/admin/sources/${sourceId}/`, data),
};

export interface HealthResponse {
  status?: string;
  [key: string]: unknown;
}

export const health = {
  get: () => get<HealthResponse>('/admin/health/'),
};

export interface DashboardMetrics {
  [key: string]: unknown;
}

export interface DashboardForecast {
  [key: string]: unknown;
}

export type InsightFeedbackStatus = 'accepted' | 'rejected';

export const dashboard = {
  getMetrics: () => get<DashboardMetrics>('/analytics/metrics/'),
  getForecast: (integrationId: string, remainingItems = 10) =>
    get<DashboardForecast>('/analytics/forecast/', {
      integration_id: integrationId,
      remaining_items: remainingItems,
    }),
  updateInsightFeedback: (insightId: number, suggestionId: string, status: InsightFeedbackStatus) =>
    patch<{ success?: boolean; detail?: string }, { insight_id: number; suggestion_id: string; status: InsightFeedbackStatus }>(
      '/analytics/insights/feedback/',
      { insight_id: insightId, suggestion_id: suggestionId, status }
    ),
};

/* =========================
   1.2 NEW MODULES
========================= */

/** ---------- users ---------- */

export interface User {
  id: string | number;
  username: string;
  email: string;
  role?: string;
  status?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  date_joined?: string;
  [key: string]: unknown;
}

export interface UserListFilters {
  role?: string;
  status?: string;
  [key: string]: string | undefined;
}

export type CreateUserPayload = Record<string, unknown>;
export type UpdateUserPayload = Record<string, unknown>;

export const users = {
  list: (filters?: UserListFilters) => get<User[]>('/admin/users/', filters),
  create: (data: CreateUserPayload) => post<User, CreateUserPayload>('/admin/users/', data),
  get: (id: string | number) => get<User>(`/admin/users/${id}/`),
  update: (id: string | number, data: UpdateUserPayload) =>
    patch<User, UpdateUserPayload>(`/admin/users/${id}/`, data),
  delete: (id: string | number) => del<{ success?: boolean; detail?: string }>(`/admin/users/${id}/`),
  updateRole: (id: string | number, role: string) =>
    patch<User, { role: string }>(`/admin/users/${id}/role/`, { role }),
};

/** ---------- integrations ---------- */

export interface Integration {
  id: string | number;
  name?: string;
  type?: string;
  status?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export type CreateIntegrationPayload = Record<string, unknown>;
export type UpdateIntegrationPayload = Record<string, unknown>;

// Mapped to 'sources' in backend
export const integrations = {
  list: () => get<Integration[]>('/admin/sources/'),
  create: (data: CreateIntegrationPayload) =>
    post<Integration, CreateIntegrationPayload>('/admin/sources/', data),
  get: (id: string | number) => get<Integration>(`/admin/sources/${id}/`),
  update: (id: string | number, data: UpdateIntegrationPayload) =>
    patch<Integration, UpdateIntegrationPayload>(`/admin/sources/${id}/`, data),
  delete: (id: string | number) =>
    del<{ success?: boolean; detail?: string }>(`/admin/sources/${id}/`),
  sync: (id: string | number) =>
    post<{ success?: boolean; detail?: string }>(`/admin/sources/${id}/sync/`),
  testConnection: (id: string | number) =>
    post<{ success?: boolean; detail?: string; result?: unknown }>(`/admin/sources/${id}/test_connection/`),
};

/** ---------- workItems ---------- */

export interface WorkItem {
  id: string | number;
  title?: string;
  status?: string;
  assignee?: string | number;
  [key: string]: unknown;
}

export interface WorkItemFilters {
  [key: string]: string | number | boolean | undefined;
}

export type UpdateWorkItemPayload = Record<string, unknown>;

export const workItems = {
  list: (filters?: WorkItemFilters) => get<WorkItem[]>('/work-items/', filters),
  get: (id: string | number) => get<WorkItem>(`/work-items/${id}/`),
  update: (id: string | number, data: UpdateWorkItemPayload) =>
    patch<WorkItem, UpdateWorkItemPayload>(`/work-items/${id}/`, data),
};

/** ---------- pullRequests ---------- */

export interface PullRequest {
  id: string | number;
  title?: string;
  status?: string;
  author?: string;
  repository?: string;
  [key: string]: unknown;
}

export interface PullRequestFilters {
  [key: string]: string | number | boolean | undefined;
}

export const pullRequests = {
  list: (filters?: PullRequestFilters) => get<PullRequest[]>('/pull-requests/', filters),
  get: (id: string | number) => get<PullRequest>(`/pull-requests/${id}/`),
};

/** ---------- aiInsights ---------- */

export interface AiInsight {
  id: string | number;
  type?: string;
  severity?: string;
  summary?: string;
  [key: string]: unknown;
}

export interface AiInsightFilters {
  [key: string]: string | number | boolean | undefined;
}

export type AiSuggestionFeedbackStatus = 'accepted' | 'rejected' | 'pending';

export interface AiInsightFeedbackPayload {
  suggestion_id: string;
  status: AiSuggestionFeedbackStatus;
}

export const aiInsights = {
  list: (filters?: AiInsightFilters) => get<AiInsight[]>('/ai-insights/', filters),
  get: (id: string | number) => get<AiInsight>(`/ai-insights/${id}/`),
  updateFeedback: (
    insightId: string | number,
    suggestionId: string,
    status: AiSuggestionFeedbackStatus
  ) =>
    patch<{ success?: boolean; detail?: string }, AiInsightFeedbackPayload>(
      `/ai-insights/${insightId}/feedback/`,
      { suggestion_id: suggestionId, status }
    ),
};

/** ---------- settings ---------- */

export interface SystemSettings {
  // Platform-wide settings
  [key: string]: unknown;
}

export interface UpdateSystemSettingsPayload {
  [key: string]: unknown;
}

export interface RetentionPolicy {
  work_items_months: number;
  ai_insights_months: number;
  pull_requests_months: number;
  [key: string]: unknown;
}

export interface UpdateRetentionPolicyPayload {
  [key: string]: unknown;
}

export const settings = {
  getSystemSettings: () => get<SystemSettings>('/admin/settings/', {}, { cache: true }),
  updateSystemSettings: (data: UpdateSystemSettingsPayload) =>
    patch<SystemSettings, UpdateSystemSettingsPayload>('/admin/settings/', data),
  getRetentionPolicy: (tenantId: string | number) =>
    get<RetentionPolicy>(`/admin/tenants/${tenantId}/retention-policy/`),
  updateRetentionPolicy: (tenantId: string | number, data: UpdateRetentionPolicyPayload) =>
    patch<RetentionPolicy, UpdateRetentionPolicyPayload>(
      `/admin/tenants/${tenantId}/retention-policy/`,
      data
    ),
};

export interface AuditLogEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_name: string;
  tenant_name: string;
  timestamp: string;
  new_values?: any;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const activityLog = {
  list: (params?: { tenant?: string | number; action?: string; limit?: number; page?: number }) =>
    get<PaginatedResponse<AuditLogEntry>>('/admin/activity-log/', params),
};

/** ---------- notifications ---------- */

export interface Notification {
  id: string | number;
  message: string;
  notification_type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export const notifications = {
  list: () => get<Notification[]>('/notifications/'),
  markAsRead: (id: string | number) => post<{ status: string }>(`/notifications/${id}/mark-as-read/`),
  markAllAsRead: () => post<{ status: string }>('/notifications/mark-all-as-read/'),
  delete: (id: string | number) => del<{ success?: boolean; detail?: string }>(`/notifications/${id}/`),
};

export default api;