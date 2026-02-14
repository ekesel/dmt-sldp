'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../components/DashboardLayout';
import { Plus, ExternalLink, MoreVertical, Pencil, Trash2, Power } from 'lucide-react';
import { Badge } from '../components/UIComponents';
import { useCurrentTenant } from '../context/TenantContext';
import { tenants as tenantsApi } from '@dmt/api';

function formatStatus(status?: string) {
  const raw = (status || '').toLowerCase();
  if (raw === 'active') return { label: 'Active', variant: 'success' as const };
  if (raw === 'pending') return { label: 'Pending', variant: 'warning' as const };
  if (raw === 'inactive') return { label: 'Inactive', variant: 'warning' as const };
  return { label: status || 'Unknown', variant: 'warning' as const };
}

function formatDate(date?: string) {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toISOString().slice(0, 10);
}

export default function TenantsPage() {
  const router = useRouter();
  const { availableTenants, isLoading, error, refreshTenants } = useCurrentTenant();

  const [openMenuTenantId, setOpenMenuTenantId] = useState<string | null>(null);
  const [busyTenantId, setBusyTenantId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  // close menu on outside click
  useEffect(() => {
    refreshTenants();
    function handleClickOutside(e: MouseEvent) {
      if (!menuContainerRef.current) return;
      if (!menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuTenantId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tenants = useMemo(() => {
    return availableTenants.map((tenant) => {
      const usersCount = Number((tenant as any).users_count ?? (tenant as any).users ?? 0);
      return {
        id: String(tenant.id),
        name: String(tenant.name || '-'),
        slug: String((tenant as any).slug || (tenant as any).code || (tenant as any).schema_name || '-'),
        status: String((tenant as any).status || ''),
        usersCount,
        createdAt: String((tenant as any).created_at || (tenant as any).created || (tenant as any).created_on || ''),
      };
    });
  }, [availableTenants]);

  const handleCreateTenant = () => {
    // Change to your actual route if different
    router.push('/tenants/new');
  };

  const handleOpenTenant = (tenant: any) => {
    if (!tenant.slug) return;
    // Construct the URL based on the slug. 
    // In production, this would be tenant.slug.domain.com.
    // NEXT_PUBLIC_COMPANY_PORTAL_BASE_URL should be something like ".localhost:3000" or ".company.com"
    const baseUrl = process.env.NEXT_PUBLIC_COMPANY_PORTAL_BASE_URL || '.localhost:3000';
    const url = `http://${tenant.slug}${baseUrl}`;
    window.open(url, '_blank');
  };

  const handleEditTenant = (tenantId: string) => {
    setOpenMenuTenantId(null);
    router.push(`/tenants/${tenantId}`);
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
    setOpenMenuTenantId(null);
    setBusyTenantId(tenantId);
    try {
      if (currentStatus.toLowerCase() === 'active') {
        await tenantsApi.deactivate(tenantId);
      } else {
        await tenantsApi.activate(tenantId);
      }
      await refreshTenants();
    } catch (err: any) {
      alert(`Error toggling status: ${err.message}`);
    } finally {
      setBusyTenantId(null);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this tenant? This will also delete all associated data.');
    if (!confirmed) return;

    setOpenMenuTenantId(null);
    setBusyTenantId(tenantId);
    try {
      await tenantsApi.delete(tenantId);
      await refreshTenants();
    } catch (err: any) {
      alert(`Error deleting tenant: ${err.message}`);
    } finally {
      setBusyTenantId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Tenants</h1>
            <p className="text-slate-400">Manage all registered tenants and their configurations.</p>
          </div>
          <button
            type="button"
            onClick={handleCreateTenant}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
          >
            <Plus className="w-5 h-5" />
            New Tenant
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Users</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Created</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      Loading tenants...
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No tenants found.
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => {
                    const status = formatStatus(tenant.status);
                    const isMenuOpen = openMenuTenantId === tenant.id;
                    const isBusy = busyTenantId === tenant.id;

                    return (
                      <tr key={tenant.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/40 to-blue-600/40 flex items-center justify-center font-semibold text-blue-300">
                              {(tenant.name || 'T')[0]}
                            </div>
                            <div>
                              <p className="text-white font-medium">{tenant.name}</p>
                              <p className="text-xs text-slate-500">{tenant.slug}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <Badge label={status.label} variant={status.variant} />
                        </td>

                        <td className="px-6 py-4 text-white font-medium">{tenant.usersCount}</td>
                        <td className="px-6 py-4 text-slate-400 text-sm">{formatDate(tenant.createdAt)}</td>

                        <td className="px-6 py-4">
                          <div ref={menuContainerRef} className="relative flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenTenant(tenant)}
                              disabled={isBusy}
                              className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-slate-300 disabled:opacity-50"
                              title="Open tenant"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuTenantId((prev) => (prev === tenant.id ? null : tenant.id))
                              }
                              disabled={isBusy}
                              className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-slate-300 disabled:opacity-50"
                              title="More actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 top-10 z-20 min-w-[190px] rounded-lg border border-slate-700 bg-slate-900 shadow-lg p-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditTenant(tenant.id)}
                                  className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 rounded"
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <Pencil className="w-4 h-4" /> Edit tenant
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(tenant.id, tenant.status)}
                                  className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 rounded"
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <Power className="w-4 h-4" />
                                    {tenant.status.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteTenant(tenant.id)}
                                  className="w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-slate-800 rounded"
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <Trash2 className="w-4 h-4" /> Delete tenant
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}