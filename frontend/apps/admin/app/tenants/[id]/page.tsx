'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '../../components/DashboardLayout';
import { ArrowLeft, Save, AlertCircle, Loader2 } from 'lucide-react';
import { tenants as tenantsApi, Tenant } from '@dmt/api';

export default function TenantDetailsPage() {
    const router = useRouter();
    const { id } = useParams();
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchTenant();
        }
    }, [id]);

    const fetchTenant = async () => {
        setIsLoading(true);
        try {
            const data = await tenantsApi.get(id as string);
            setTenant(data);
            setName(data.name);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch tenant details.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            setError('Name is required.');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await tenantsApi.update(id as string, { name });
            router.push('/tenants');
        } catch (err: any) {
            setError(err.message || 'Failed to update tenant.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Manage Tenant</h1>
                        <p className="text-slate-400 text-sm">Update tenant details and configuration.</p>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {tenant && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                                        Company Name
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-300">
                                        Slug (Read-only)
                                    </label>
                                    <input
                                        type="text"
                                        value={tenant.slug || ''}
                                        disabled
                                        className="w-full bg-slate-800/20 border border-slate-800 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-300">
                                        Schema Name (Read-only)
                                    </label>
                                    <input
                                        type="text"
                                        value={String(tenant.schema_name || '')}
                                        disabled
                                        className="w-full bg-slate-800/20 border border-slate-800 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-300">
                                        Status
                                    </label>
                                    <div className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white">
                                        {String(tenant.status).toUpperCase()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                            >
                                {isSaving ? (
                                    'Saving...'
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </DashboardLayout>
    );
}
