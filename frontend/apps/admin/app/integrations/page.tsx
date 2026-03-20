'use client';
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import {
    Plus, Search, Filter, MoreHorizontal,
    RefreshCcw, Play, Edit, Trash2, Eye
} from 'lucide-react';
import { Badge } from '../components/UIComponents';
import { integrations } from '@dmt/api';
import { toast } from 'react-hot-toast';
import { IntegrationModal } from '../components/integrations/IntegrationModal';
import { IntegrationDetailsModal } from '../components/integrations/IntegrationDetailsModal';

export default function IntegrationsPage() {
    const [integrationList, setIntegrationList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<any>(null);

    useEffect(() => {
        fetchIntegrations();
    }, []);

    const fetchIntegrations = async () => {
        setLoading(true);
        try {
            const data = await integrations.list();
            setIntegrationList(data);
        } catch (error) {
            console.error('Failed to fetch integrations:', error);
            toast.error('Failed to load integrations');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number | string) => {
        if (!confirm('Are you sure you want to delete this integration? This action cannot be undone.')) return;

        try {
            await integrations.delete(id);
            toast.success('Integration deleted');
            fetchIntegrations();
        } catch (error) {
            toast.error('Failed to delete integration');
        }
    };

    const handleSync = async (id: number | string) => {
        try {
            await integrations.sync(id);
            toast.success('Sync started successfully');
            // Optimistically update timestamp or just re-fetch
            fetchIntegrations();
        } catch (error) {
            toast.error('Failed to start sync');
        }
    };

    const openEdit = (integration: any) => {
        setSelectedIntegration(integration);
        setIsEditModalOpen(true);
    };

    const openDetails = (integration: any) => {
        setSelectedIntegration(integration);
        setIsDetailsModalOpen(true);
    };

    // Filtering
    const filteredIntegrations = integrationList.filter(item =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
                        <p className="text-muted-foreground mt-1">Manage external tool connections and data synchronization.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center gap-2 transition shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} /> New Integration
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-card/50 p-4 rounded-xl border border-border flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Search integrations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none transition"
                        />
                    </div>
                    <button className="px-4 py-2 flex items-center gap-2 bg-secondary text-secondary-foreground border border-border rounded-lg hover:bg-secondary/80 transition">
                        <Filter size={18} /> Filter
                    </button>
                    <button
                        onClick={fetchIntegrations}
                        className="p-2 bg-secondary text-secondary-foreground border border-border rounded-lg hover:bg-secondary/80 transition"
                    >
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Table */}
                <div className="bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Sync</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading && integrationList.length === 0 ? (
                                    // Skeleton
                                    [...Array(3)].map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4"><div className="h-4 w-32 bg-muted rounded animate-pulse" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-28 bg-muted rounded animate-pulse" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-8 ml-auto bg-muted rounded animate-pulse" /></td>
                                        </tr>
                                    ))
                                ) : filteredIntegrations.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                            No integrations found. Click "New Integration" to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredIntegrations.map((integration) => (
                                        <tr key={integration.id} className="group hover:bg-muted/50 transition">
                                            <td className="px-6 py-4 font-medium text-foreground">
                                                {integration.name}
                                            </td>
                                            <td className="px-6 py-4 capitalize text-foreground">
                                                {integration.source_type?.replace('_', ' ')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge
                                                    label={integration.is_active ? 'Active' : 'Inactive'}
                                                    variant={integration.is_active ? 'success' : 'neutral'}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                                                {integration.last_sync_at ? new Date(integration.last_sync_at).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 text-muted-foreground opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openDetails(integration)}
                                                        className="p-1 hover:text-primary transition"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSync(integration.id)}
                                                        className="p-1 hover:text-success transition"
                                                        title="Sync Now"
                                                    >
                                                        <Play size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(integration)}
                                                        className="p-1 hover:text-warning transition"
                                                        title="Edit"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(integration.id)}
                                                        className="p-1 hover:text-destructive transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <IntegrationModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                mode="create"
                onSuccess={fetchIntegrations}
            />

            <IntegrationModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                mode="edit"
                integrationId={selectedIntegration?.id}
                onSuccess={fetchIntegrations}
            />

            <IntegrationDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                integration={selectedIntegration}
            />

        </DashboardLayout>
    );
}
