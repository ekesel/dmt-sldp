'use client';

import React, { useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Plus, ExternalLink, MoreVertical } from 'lucide-react';
import { Badge } from '../components/UIComponents';
import { useCurrentTenant } from '../context/TenantContext';

function formatStatus(status?: string) {
  const raw = (status || '').toLowerCase();
  if (raw === 'active') return { label: 'Active', variant: 'success' as const };
  if (raw === 'pending') return { label: 'Pending', variant: 'warning' as const };
  return { label: status || 'Unknown', variant: 'warning' as const };
}

function formatDate(date?: string) {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toISOString().slice(0, 10);
}

export default function TenantsPage() {
  const { availableTenants, isLoading, error, refreshTenants } = useCurrentTenant();

  useEffect(() => {
    void refreshTenants();
  }, [refreshTenants]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Tenants</h1>
            <p className="text-slate-400">Manage all registered tenants and their configurations.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition">
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
                ) : availableTenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No tenants found.
                    </td>
                  </tr>
                ) : (
                  availableTenants.map((tenant) => {
                    const status = formatStatus(String(tenant.status || ''));
                    const usersCount = Number(tenant.users_count ?? tenant.users ?? 0);

                    return (
                      <tr key={String(tenant.id)} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/40 to-blue-600/40 flex items-center justify-center font-semibold text-blue-300">
                              {(tenant.name || 'T')[0]}
                            </div>
                            <div>
                              <p className="text-white font-medium">{tenant.name || '-'}</p>
                              <p className="text-xs text-slate-500">{tenant.slug || tenant.code || '-'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <Badge label={status.label} variant={status.variant} />
                        </td>

                        <td className="px-6 py-4 text-white font-medium">{usersCount}</td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {formatDate((tenant.created_at as string) || (tenant.created as string))}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-slate-300">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-slate-300">
                              <MoreVertical className="w-4 h-4" />
                            </button>
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