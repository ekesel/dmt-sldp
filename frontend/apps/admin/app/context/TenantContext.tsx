'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';
import api, { tenants as tenantsApi } from '../../../../packages/api';

/* =========================
   Types
========================= */

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  code?: string;
  status?: 'active' | 'inactive' | 'pending' | string;
  users?: number;
  users_count?: number;
  created?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface TenantContextValue {
  currentTenantId: string;
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  isLoading: boolean;
  error: string | null;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenants: () => Promise<void>;
}

/* =========================
   Constants
========================= */

const TENANT_STORAGE_KEY = 'dmt-tenant';
const TENANT_QUERY_PARAM = 'tenant_id';

/* =========================
   Context
========================= */

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

/* =========================
   Helpers
========================= */

function normalizeTenantId(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function toTenantArray(payload: unknown): Tenant[] {
  if (Array.isArray(payload)) return payload as Tenant[];
  if (
    payload &&
    typeof payload === 'object' &&
    'results' in payload &&
    Array.isArray((payload as any).results)
  ) {
    return (payload as any).results as Tenant[];
  }
  return [];
}

function getStoredTenantId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TENANT_STORAGE_KEY) || '';
}

/* =========================
   Provider
========================= */

interface TenantProviderProps {
  children: ReactNode;
  autoLoad?: boolean; // Option A: set false in root; load only where needed
}

export function TenantProvider({ children, autoLoad = false }: TenantProviderProps) {
  const searchParams = useSearchParams();

  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isFetchingRef = useRef(false);

  const syncTenantHeaders = useCallback((tenantId: string) => {
    if (!tenantId) {
      delete api.defaults.headers.common['X-Tenant'];
      delete api.defaults.headers.common['tenant_id'];
      return;
    }

    api.defaults.headers.common['X-Tenant'] = tenantId;
    api.defaults.headers.common['tenant_id'] = tenantId;
  }, []);

  const persistTenant = useCallback(
    (tenantId: string) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
      syncTenantHeaders(tenantId);
    },
    [syncTenantHeaders]
  );

  const resolveInitialTenantId = useCallback(
    (tenants: Tenant[]): string => {
      const queryTenant = normalizeTenantId(searchParams?.get(TENANT_QUERY_PARAM));
      const storedTenant = getStoredTenantId();
      const tenantIds = new Set(tenants.map((t) => normalizeTenantId(t.id)));

      if (queryTenant && tenantIds.has(queryTenant)) return queryTenant;
      if (storedTenant && tenantIds.has(storedTenant)) return storedTenant;

      const first = tenants[0];
      return first ? normalizeTenantId(first.id) : '';
    },
    [searchParams]
  );

  const refreshTenants = useCallback(async () => {
    if (isFetchingRef.current) return; // dedupe concurrent calls
    isFetchingRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const payload = await tenantsApi.list();
      const tenantList = toTenantArray(payload);

      setAvailableTenants(tenantList);

      const initialTenantId = resolveInitialTenantId(tenantList);
      setCurrentTenantId(initialTenantId);

      if (initialTenantId) {
        persistTenant(initialTenantId);
      } else {
        syncTenantHeaders('');
      }
    } catch (err: any) {
      const message =
        err?.message ||
        err?.response?.data?.detail ||
        'Failed to load tenants';
      setError(message);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [persistTenant, resolveInitialTenantId, syncTenantHeaders]);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      const normalized = normalizeTenantId(tenantId);
      if (!normalized) return;

      const exists = availableTenants.some(
        (t) => normalizeTenantId(t.id) === normalized
      );

      if (!exists) {
        setError('Selected tenant is not accessible for this user.');
        return;
      }

      setError(null);
      setCurrentTenantId(normalized);
      persistTenant(normalized);
    },
    [availableTenants, persistTenant]
  );

  // Lazy load tenants only when autoLoad is enabled
  useEffect(() => {
    if (!autoLoad) return;
    void refreshTenants();
  }, [autoLoad, refreshTenants]);

  // Apply query param change only if we already have tenants list
  useEffect(() => {
    if (!availableTenants.length) return;

    const queryTenant = normalizeTenantId(searchParams?.get(TENANT_QUERY_PARAM));
    if (!queryTenant) return;

    const isValid = availableTenants.some(
      (t) => normalizeTenantId(t.id) === queryTenant
    );

    if (isValid && queryTenant !== currentTenantId) {
      setCurrentTenantId(queryTenant);
      persistTenant(queryTenant);
      setError(null);
    }
  }, [availableTenants, currentTenantId, persistTenant, searchParams]);

  const currentTenant = useMemo(
    () =>
      availableTenants.find(
        (t) => normalizeTenantId(t.id) === normalizeTenantId(currentTenantId)
      ) || null,
    [availableTenants, currentTenantId]
  );

  const value: TenantContextValue = useMemo(
    () => ({
      currentTenantId,
      currentTenant,
      availableTenants,
      isLoading,
      error,
      switchTenant,
      refreshTenants,
    }),
    [
      currentTenantId,
      currentTenant,
      availableTenants,
      isLoading,
      error,
      switchTenant,
      refreshTenants,
    ]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useCurrentTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useCurrentTenant must be used within TenantProvider');
  }
  return ctx;
}

export default TenantContext;