'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

interface FormattedTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  usersCount: number;
  createdAt: string;
}

export default function TenantsPage() {
  const router = useRouter();
  const { availableTenants, isLoading, error, refreshTenants } = useCurrentTenant();

  const [openMenuTenantId, setOpenMenuTenantId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [busyTenantId, setBusyTenantId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    refreshTenants();
  }, [refreshTenants]);

  // Close menu on outside click, window/table scroll, or window resize
  useEffect(() => {
    if (!openMenuTenantId) return;

    function handleClose() {
      setOpenMenuTenantId(null);
      setMenuPosition(null);
    }

    function handleClickOutside(e: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [openMenuTenantId]);

  const tenants = useMemo<FormattedTenant[]>(() => {
    return availableTenants.map((tenant) => {
      const usersCount = Number(tenant.users_count ?? tenant.users ?? 0);
      return {
        id: String(tenant.id),
        name: String(tenant.name || '-'),
        slug: String(tenant.slug || tenant.code || tenant.schema_name || '-'),
        status: String(tenant.status || ''),
        usersCount,
        createdAt: String(tenant.created_at || tenant.created || tenant.created_on || ''),
      };
    });
  }, [availableTenants]);

  const activeMenuTenant = useMemo(() => {
    return tenants.find((t) => t.id === openMenuTenantId);
  }, [tenants, openMenuTenantId]);

  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, tenantId: string) => {
    e.stopPropagation();
    if (openMenuTenantId === tenantId) {
      setOpenMenuTenantId(null);
      setMenuPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 145; // Approximate height of the menu
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const right = window.innerWidth - rect.right;

    if (spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow) {
      // Position above the button when space below is tight
      setMenuPosition({
        bottom: window.innerHeight - rect.top + 6,
        right: Math.max(10, right),
      });
    } else {
      // Position below the button
      setMenuPosition({
        top: rect.bottom + 6,
        right: Math.max(10, right),
      });
    }

    setOpenMenuTenantId(tenantId);
  };

  const handleCreateTenant = () => {
    // Change to your actual route if different
    router.push('/tenants/new');
  };

  const handleOpenTenant = (tenant: FormattedTenant) => {
    if (!tenant.slug || tenant.slug === '-') return;
    const baseUrl = process.env.NEXT_PUBLIC_COMPANY_PORTAL_BASE_URL || '.localhost:3000';
    const protocol = process.env.NEXT_PUBLIC_COMPANY_PORTAL_PROTOCOL || 'http';
    const url = `${protocol}://${tenant.slug}${baseUrl}`;
    window.open(url, '_blank');
  };

  const handleEditTenant = (tenantId: string) => {
    setOpenMenuTenantId(null);
    setMenuPosition(null);
    router.push(`/tenants/${tenantId}`);
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
    setOpenMenuTenantId(null);
    setMenuPosition(null);
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
    setMenuPosition(null);
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Tenants</h1>
            <p className="text-muted-foreground">Manage all registered tenants and their configurations.</p>
          </div>
          <button
            type="button"
            onClick={handleCreateTenant}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            New Tenant
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-card/50 border border-border rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Users</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Created</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      Loading tenants...
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No tenants found.
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => {
                    const status = formatStatus(tenant.status);
                    const isMenuOpen = openMenuTenantId === tenant.id;
                    const isBusy = busyTenantId === tenant.id;

                    return (
                      <tr key={tenant.id} className="hover:bg-accent/30 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center font-semibold text-primary">
                              {(tenant.name || 'T')[0]}
                            </div>
                            <div>
                              <p className="text-foreground font-medium">{tenant.name}</p>
                              <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <Badge label={status.label} variant={status.variant} />
                        </td>

                        <td className="px-6 py-4 text-foreground font-medium">{tenant.usersCount}</td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">{formatDate(tenant.createdAt)}</td>

                        <td className="px-6 py-4">
                          <div className="relative flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditTenant(tenant.id)}
                              disabled={isBusy}
                              className="p-2 hover:bg-muted rounded-lg transition text-primary hover:text-primary/80 disabled:opacity-50"
                              title="Manage Tenant"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenTenant(tenant)}
                              disabled={isBusy}
                              className="p-2 hover:bg-muted rounded-lg transition text-muted-foreground hover:text-foreground disabled:opacity-50"
                              title="Open Client Portal"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleToggleMenu(e, tenant.id)}
                              disabled={isBusy}
                              className={`p-2 hover:bg-muted rounded-lg transition disabled:opacity-50 ${
                                isMenuOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                              }`}
                              title="Tenant Actions"
                              aria-haspopup="true"
                              aria-expanded={isMenuOpen}
                            >
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

        {openMenuTenantId && menuPosition && activeMenuTenant && typeof document !== 'undefined' && createPortal(
          <div
            ref={menuContainerRef}
            style={{
              position: 'fixed',
              top: menuPosition.top !== undefined ? `${menuPosition.top}px` : undefined,
              bottom: menuPosition.bottom !== undefined ? `${menuPosition.bottom}px` : undefined,
              right: `${menuPosition.right}px`,
              zIndex: 9999,
            }}
            className="min-w-[190px] rounded-lg border border-border bg-popover shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => handleEditTenant(activeMenuTenant.id)}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted rounded flex items-center gap-2 transition"
            >
              <Pencil className="w-4 h-4" /> Edit tenant
            </button>

            <button
              type="button"
              onClick={() => handleToggleStatus(activeMenuTenant.id, activeMenuTenant.status)}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted rounded flex items-center gap-2 transition"
            >
              <Power className="w-4 h-4" />
              {activeMenuTenant.status.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}
            </button>

            <button
              type="button"
              onClick={() => handleDeleteTenant(activeMenuTenant.id)}
              className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-muted rounded flex items-center gap-2 transition"
            >
              <Trash2 className="w-4 h-4" /> Delete tenant
            </button>
          </div>,
          document.body
        )}
      </div>
    </DashboardLayout>
  );
}