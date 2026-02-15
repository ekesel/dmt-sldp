'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Settings, RefreshCw, Eye, AlertCircle, Plus, Loader2, Trash2, Zap, ShieldCheck } from "lucide-react";
import { DashboardLayout } from '../../../components/DashboardLayout';
import { Badge } from '../../../components/UIComponents';
import { SourceConfigModal } from '../../../components/sources/SourceConfigModal';
import SyncProgressModal from '../../../components/sources/SyncProgressModal';
import { sources as sourcesApi, Source as ApiSource } from '@dmt/api';
import { toast } from 'react-hot-toast';

interface Source {
    id: number;
    name: string;
    source_type: string;
    last_sync_status: string;
    last_sync_at: string | null;
    tenant_id?: string | number;
}

export default function SourceConfigPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [sources, setSources] = useState<Source[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSource, setSelectedSource] = useState<Source | undefined>(undefined);

    // Sync Progress Modal State
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [syncSource, setSyncSource] = useState<{ id: number, name: string, tenantId: string } | null>(null);

    useEffect(() => {
        if (projectId) {
            fetchSources();
        }
    }, [projectId]);

    const fetchSources = async () => {
        try {
            setIsLoading(true);
            const data = await sourcesApi.list(projectId);
            setSources(data as unknown as Source[]);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch sources");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSource = () => {
        setSelectedSource(undefined);
        setIsModalOpen(true);
    };

    const handleEditSource = (source: Source) => {
        setSelectedSource(source);
        setIsModalOpen(true);
    };

    const handleDeleteSource = async (id: number) => {
        if (!confirm("Are you sure you want to delete this source?")) return;
        try {
            await sourcesApi.delete(id);
            toast.success("Source deleted");
            fetchSources();
        } catch (error) {
            toast.error("Failed to delete source");
        }
    };

    const handleTestConnection = async (id: number) => {
        try {
            toast.loading("Testing connection...", { id: 'test-conn' });
            const res = await sourcesApi.testConnection(id);
            if (res.status === 'success') {
                toast.success("Connection Successful!", { id: 'test-conn' });
            } else {
                toast.error(res.message || "Connection Failed", { id: 'test-conn' });
            }
        } catch (error: any) {
            toast.error(error.message || "Connection Failed", { id: 'test-conn' });
        }
    };

    const handleTriggerSync = async (source: Source) => {
        setSyncSource({
            id: source.id,
            name: source.name,
            tenantId: String(source.tenant_id || '1')
        });
        setIsSyncModalOpen(true);
        try {
            await sourcesApi.triggerSync(source.id);
        } catch (err: any) {
            toast.error(`Failed to trigger sync: ${err.message}`);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'success';
            case 'failed': return 'error';
            case 'in_progress': return 'info';
            default: return 'default';
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <Settings className="text-blue-500" />
                            Source Configurations
                        </h1>
                        <p className="text-slate-400">Manage integrations for Project ID: {projectId}</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition font-medium text-sm"
                        >
                            Back to Project
                        </button>
                        <button
                            onClick={handleAddSource}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-medium"
                        >
                            <Plus size={18} />
                            Add Source
                        </button>
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {sources.length === 0 ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                                <Settings className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">No sources configured</h3>
                                <p className="text-slate-500 mb-6">Connect ClickUp, Azure DevOps or other tools to start analyzing data.</p>
                                <button
                                    onClick={handleAddSource}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition"
                                >
                                    Connect First Source
                                </button>
                            </div>
                        ) : (
                            sources.map((s) => (
                                <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between hover:border-slate-700 transition gap-4">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-white uppercase text-xl">
                                            {s.source_type[0]}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">{s.name}</h3>
                                            <p className="text-slate-400 text-sm uppercase tracking-wider">{s.source_type}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-8">
                                        <div className="text-center">
                                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Status</p>
                                            <Badge
                                                label={s.last_sync_status || 'Never Synced'}
                                                variant={getStatusColor(s.last_sync_status) as any}
                                            />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Last Sync</p>
                                            <p className="text-white font-medium text-sm">
                                                {s.last_sync_at ? new Date(s.last_sync_at).toLocaleString() : 'Never'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleTestConnection(s.id)}
                                                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 p-2 rounded-lg transition"
                                                title="Test Connection"
                                            >
                                                <ShieldCheck size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleTriggerSync(s)}
                                                className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 p-2 rounded-lg transition"
                                                title="Sync Now"
                                            >
                                                <Zap size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleEditSource(s)}
                                                className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-400 hover:text-white transition"
                                                title="Edit Config"
                                            >
                                                <RefreshCw size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSource(s.id)}
                                                className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 p-2 rounded-lg transition"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {sources.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 flex gap-4 p-4 rounded-xl">
                        <AlertCircle className="text-amber-500 shrink-0" />
                        <p className="text-amber-200 text-sm">
                            Configuration changes may take a few minutes to reflect in the analytics dashboard.
                        </p>
                    </div>
                )}
            </div>

            <SourceConfigModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                projectId={projectId}
                source={selectedSource as any}
                onSuccess={fetchSources}
            />

            {syncSource && (
                <SyncProgressModal
                    isOpen={isSyncModalOpen}
                    onClose={() => {
                        setIsSyncModalOpen(false);
                        fetchSources();
                    }}
                    sourceId={syncSource.id}
                    sourceName={syncSource.name}
                    tenantId={syncSource.tenantId}
                />
            )}
        </DashboardLayout>
    );
}
