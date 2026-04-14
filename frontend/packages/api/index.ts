import axios, { AxiosError } from 'axios';
import { getCache, setCache } from './cache';
import { deduplicateRequest } from './deduplication';

/* =========================
   Axios Instance
========================= */
const getBaseURL = () => {
  // 1. ALWAYS respect the explicit environment variable FIRST (e.g. https://api.elevate.samta.ai/api/)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2. Only if no env is found, attempt to construct a local fallback (useful for dev without env)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // If not localhost, use a relative path to inherit the current protocol and domain
    if (!isLocalhost) {
      return '/api/';
    }

    // For local development, default to http://localhost:8000/api/
    return `http://${hostname}:8000/api/`;
  }

  // 3. Server-side fallback if all else fails
  return process.env.NEXT_PUBLIC_API_URL_FALLBACK || 'http://backend:8000/api/';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// Add JWT token and X-Tenant if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('dmt-access-token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Explicitly pull from defaults if not in config (Axios should do this but sometimes it's shaky with interceptors)
    if (!config.headers['X-Tenant'] && api.defaults.headers.common['X-Tenant']) {
      config.headers['X-Tenant'] = api.defaults.headers.common['X-Tenant'];
    }

    // Auto-inject X-Tenant from hostname if not already set (preventing overriding Admin Portal explicit setting)
    if (!config.headers['X-Tenant']) {
      const host = window.location.hostname;
      const parts = host.split('.');
      const devDomains = process.env.NEXT_PUBLIC_DEV_DOMAINS
        ? process.env.NEXT_PUBLIC_DEV_DOMAINS.split(',')
        : ['localhost', '127.0.0.1'];
      if (parts.length > 1 && !devDomains.includes(parts[0])) {
        config.headers['X-Tenant'] = parts[0];
      }
    }
  }
  return config;
});

// Interceptor for handling token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry && originalRequest.url !== '/auth/token/refresh/') {
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

/** Builds a query string from an object, skipping null/undefined/empty values */
function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 'null' && v !== 'undefined')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
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

/* =========================
   Identity Mapping Types
========================= */

export interface IdentityMapping {
  id: number;
  canonical_email: string;
  canonical_name: string;
  source_identities: Array<{
    system: string;
    email: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface IdentitySuggestion {
  name: string;
  emails: string[];
}

interface RequestConfig {
  cache?: boolean;
  ttl?: number;
  deduplicate?: boolean;
  headers?: Record<string, string>;
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
      const res = await api.get<T>(url, {
        params,
        ...(config?.headers ? { headers: config.headers } : {})
      });
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

async function post<TResponse, TBody = unknown>(url: string, body?: TBody, headers?: Record<string, string>): Promise<TResponse> {
  try {
    const res = await api.post<TResponse>(url, body, headers ? { headers } : undefined);
    return res.data;
  } catch (error) {
    handleApiError(error);
  }
}

async function patch<TResponse, TBody = unknown>(url: string, body?: TBody, headers?: Record<string, string>): Promise<TResponse> {
  try {
    const res = await api.patch<TResponse>(url, body, headers ? { headers } : undefined);
    return res.data;
  } catch (error) {
    handleApiError(error);
  }
}

async function del<TResponse = void>(url: string, headers?: Record<string, string>): Promise<TResponse> {
  try {
    const res = await api.delete<TResponse>(url, headers ? { headers } : undefined);
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
  profile_picture?: string;
  custom_title?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

export const auth = {
  register: (data: AuthRegisterPayload) => post<UserProfile, AuthRegisterPayload>('/auth/register/', data),
  login: (username: string, password: string, portal?: string) =>
    post<AuthTokenResponse, { username: string; password: string; portal?: string }>('/auth/token/', { username, password, portal }),
  refreshToken: (refresh: string) =>
    post<AuthRefreshResponse, { refresh: string }>('/auth/token/refresh/', { refresh }),
  getProfile: () => get<UserProfile>('/auth/profile/'),
  updateProfile: (data: FormData | Partial<UserProfile>) => {
    if (data instanceof FormData) {
      return api.patch<UserProfile>('/auth/profile/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(res => res.data);
    }
    return patch<UserProfile, Partial<UserProfile>>('/auth/profile/', data);
  },
  logout: () => post<{ success?: boolean; detail?: string }>('/auth/logout/'),
  passwordResetRequest: (email: string) =>
    post<{ message: string }, { email: string }>('/auth/password-reset-request/', { email }),
  resetPasswordConfirm: (data: { uid: string; token: string; new_password: string }) =>
    post<{ message: string }, { uid: string; token: string; new_password: string }>('/auth/password-reset/confirm/', data),
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
  triggerSync: (id: string | number) => post<{ status: string; message: string; task_ids?: string[] }>(`/admin/projects/${id}/trigger_sync/`),
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
  triggerPrAnalysis: (sourceId: string | number) => post<{ status: string; message: string; task_id?: string }>(`/admin/sources/${sourceId}/trigger_pr_analysis/`),
  prAnalysisStatus: (sourceId: string | number) => get<{ status: string; message: string; error_message?: string; created_at?: string; finished_at?: string }>(`/admin/sources/${sourceId}/pr_analysis_status/`),
  remoteFolders: (sourceId: string | number) => get<{ status: string; folders?: { id: string; name: string }[] }>(`/admin/sources/${sourceId}/remote_folders/`),
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
  getLeaderboard: (projectId?: string | number) =>
    get<LeaderboardResponse>(`/dashboard/leaderboard/${projectId ? `?project_id=${projectId}` : ''}`),
  getSprintComparison: (sprintA: string, sprintB: string, projectId?: string | number | null, developerId?: string | null) =>
    get<any>(`/dashboard/sprint-comparison/${buildQuery({ sprint_a: sprintA, sprint_b: sprintB, project_id: projectId, developer_id: developerId })}`),
};

export interface LeaderboardWinner {
  name: string;
  email: string;
  title: string;
  avatar: string;
  score: number;
  reason?: string;
  history?: { date: string; score: number }[];
}

export interface MonthLeaderboardData {
  quality: LeaderboardWinner[];
  velocity: LeaderboardWinner[];
  reviewer: LeaderboardWinner[];
  ai: LeaderboardWinner[];
}

export interface LeaderboardResponse {
  current_month: MonthLeaderboardData;
  past_month: MonthLeaderboardData;
}

/* =========================
   1.2 NEW MODULES
========================= */

/** ---------- developers ---------- */

export interface Developer {
  id: string; // This is the email
  developer_name: string;
  developer_email: string;
  projects?: { id: number; name: string }[];
  [key: string]: unknown;
}

export const developers = {
  list: (projectId?: string | number | null) => get<Developer[]>(`/developers/${buildQuery({ project_id: projectId })}`),
  getMetrics: (id: string, projectId?: string, sprintId?: number | null) =>
    get<any>(`/developers/${id}/metrics/${buildQuery({ project_id: projectId, sprint_id: sprintId })}`),
  getComparison: (id: string, projectId?: string, sprintId?: number | null) =>
    get<any>(`/developers/${id}/comparison/${buildQuery({ project_id: projectId, sprint_id: sprintId })}`),
};

export const compliance = {
  listFlags: (projectId?: string | number | null, sprintId?: string | number | null) =>
    get<any[]>(`/compliance-flags/${buildQuery({ project_id: projectId, sprint_id: sprintId })}`),
  resolveFlag: (flagId: string) =>
    post<any>(`/compliance-flags/${flagId}/resolve/`, {}),
  getSummary: (projectId?: string | number | null, sprintId?: string | number | null) =>
    get<any>(`/compliance-summary/${buildQuery({ project_id: projectId, sprint_id: sprintId })}`),
};

export const sprints = {
  list: (projectId?: string | number | null) =>
    get<any[]>(`/sprints/${buildQuery({ project_id: projectId })}`),
};

/** ---------- users ---------- */

export interface User {
  id: string | number;
  username: string;
  email: string;
  role?: string;
  status?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  custom_title?: string;
  avatar_url?: string;
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
  invite: (id: string | number) => post<{ message: string; invite_link: string; user: any }, any>(`/users/${id}/invite/`, {}),
};

/** ---------- metadata ---------- */

export interface MetadataCategory {
  id: number;
  name: string;
}

export interface MetadataValue {
  id: number;
  category_id: number;
  value: string;
}

export interface Metadata {
  id: number;
  name: string;
  values: string[];
}

// Mock Data
let metadataValueIdCounter = 100;
let metadataCategoryIdCounter = 10;

let mockMetadataCategories: MetadataCategory[] = [
  { id: 1, name: "Team" },
  { id: 2, name: "Project" },
  { id: 3, name: "Type" }
];

let mockMetadataValues: MetadataValue[] = [
  { id: 11, category_id: 1, value: "Engineering" },
  { id: 12, category_id: 1, value: "Backend" },
  { id: 13, category_id: 1, value: "Design" },

  { id: 21, category_id: 2, value: "Knowledge Base" },
  { id: 22, category_id: 2, value: "Infrastructure" },

  { id: 31, category_id: 3, value: "PPT" },
  { id: 32, category_id: 3, value: "DOC" }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/* =========================
   Metadata Module
========================= */
export const metadata = {
  // Replace with get('/metadata/categories/')
  getCategories: async (): Promise<MetadataCategory[]> => {
    await delay(200);
    return [...mockMetadataCategories];
  },

  // Replace with get('/metadata/')
  list: async (): Promise<Metadata[]> => {
    await delay(300);
    return mockMetadataCategories.map(category => ({
      id: category.id,
      name: category.name,
      values: mockMetadataValues
        .filter(v => v.category_id === category.id)
        .map(v => v.value)
    }));
  },

  // Replace with get(`/metadata/categories/${categoryId}/values/`)
  getByCategory: async (categoryId: number): Promise<{ id: number, value: string }[]> => {
    await delay(200);
    return mockMetadataValues
      .filter(v => v.category_id === categoryId)
      .map(v => ({ id: v.id, value: v.value }));
  },

  // Replace with post('/metadata/categories/', body)
  createCategory: async (body: { name: string }): Promise<MetadataCategory> => {
    await delay(200);
    if (!body.name || !body.name.trim()) {
      throw new Error("Category name is required");
    }
    const newCategory: MetadataCategory = {
      id: ++metadataCategoryIdCounter,
      name: body.name.trim()
    };
    mockMetadataCategories.push(newCategory);
    return newCategory;
  },

  // Replace with post('/metadata/values/', body)
  addValue: async (body: { category_id: number; value: string }): Promise<{ id: number; value: string }> => {
    await delay(200);
    if (!body.value || !body.value.trim()) {
      throw new Error("Value cannot be empty");
    }
    const categoryExists = mockMetadataCategories.some(cat => cat.id === body.category_id);
    if (!categoryExists) {
      throw new Error(`Category with ID ${body.category_id} does not exist`);
    }
    const isDuplicate = mockMetadataValues.some(
      v => v.category_id === body.category_id &&
        v.value.toLowerCase() === body.value.trim().toLowerCase()
    );
    if (isDuplicate) {
      throw new Error(`Value '${body.value}' already exists in this category`);
    }

    const newValue: MetadataValue = {
      id: ++metadataValueIdCounter,
      category_id: body.category_id,
      value: body.value.trim()
    };

    mockMetadataValues.push(newValue);
    return { id: newValue.id, value: newValue.value };
  }
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
  project_id?: string | number;
  insight_type?: 'general' | 'deep_sprint';
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
  refresh: (projectId?: number | null, insightType: string = 'general', sprintId?: number | null) =>
    post<{ status: string; message: string }>('/ai-insights/refresh/', {
      project_id: projectId,
      insight_type: insightType,
      sprint_id: sprintId
    }),
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

export interface DMTNotification {
  id: string | number;
  title?: string;
  message: string;
  notification_type: 'info' | 'success' | 'warning' | 'error' | string;
  is_read: boolean;
  created_at: string;
}

/** @deprecated Use DMTNotification instead */
export type Notification = DMTNotification;

export const notifications = {
  list: () => get<DMTNotification[]>('/notifications/'),
  markAsRead: (id: string | number) => post<{ status: string }>(`/notifications/${id}/mark-as-read/`),
  markAllAsRead: () => post<{ status: string }>('/notifications/mark-all-as-read/'),
  delete: (id: string | number) => del<{ success?: boolean; detail?: string }>(`/notifications/${id}/`),
  send: (data: { recipient_id: string | number; title: string; message: string; notification_type?: string }) =>
    post<DMTNotification, any>('/notifications/send/', data),
  sendBulk: (data: {
    recipient_ids: (string | number)[];
    title: string;
    message: string;
    notification_type?: string;
  }) => post<{ sent: number; failed: { id: string | number; reason: string }[] }, any>('/notifications/send-bulk/', data),
};

export const identity = {
  getMappings: (tenantId: string) => get<IdentityMapping[]>('/admin/identity-mappings/', {}, { headers: { 'X-Tenant': tenantId } }),
  getSuggestions: (tenantId: string) => get<IdentitySuggestion[]>('/admin/identity-mappings/suggestions/', {}, { headers: { 'X-Tenant': tenantId } }),
  search: (query: string, tenantId: string) => get<{ email: string; name: string }[]>(`/admin/identity-mappings/search/?q=${encodeURIComponent(query)}`, {}, { headers: { 'X-Tenant': tenantId } }),
  createMapping: (data: Partial<IdentityMapping>, tenantId: string) => post<IdentityMapping>('/admin/identity-mappings/', data, { 'X-Tenant': tenantId }),
  updateMapping: (id: number, data: Partial<IdentityMapping>, tenantId: string) => patch<IdentityMapping>(`/admin/identity-mappings/${id}/`, data, { 'X-Tenant': tenantId }),
  deleteMapping: (id: number, tenantId: string) => del<{ success?: boolean }>(`/admin/identity-mappings/${id}/`, { 'X-Tenant': tenantId }),
};

export { tags } from './knowledge-base-apis/tags-api'

export { getWebSocketManager } from './websocket';
export type { TelemetryMessage } from './websocket';

export default api;