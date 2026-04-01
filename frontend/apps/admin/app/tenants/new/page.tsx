'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../components/DashboardLayout';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { tenants as tenantsApi } from '@dmt/api';

export default function NewTenantPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !slug) {
            setError('Name and Slug are required.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await tenantsApi.create({
                name,
                slug,
                schema_name: slug.replace(/-/g, '_'),
            });
            router.push('/tenants');
        } catch (err: any) {
            setError(err.message || 'Failed to create tenant.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-1">Create New Tenant</h1>
                        <p className="text-muted-foreground text-sm">Register a new company and initialize their dedicated workspace.</p>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-card/50 border border-border rounded-2xl p-6 space-y-6 backdrop-blur-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
                                    Company Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Acme Corp"
                                    className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="slug" className="block text-sm font-medium text-muted-foreground">
                                    Subdomain Slug
                                </label>
                                <div className="relative">
                                    <input
                                        id="slug"
                                        type="text"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        placeholder="acme-corp"
                                        className="w-full bg-muted border border-border rounded-lg pl-4 pr-[200px] py-2 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                                        required
                                    />
                                    <span 
                                        className="absolute right-3 top-2.5 text-muted-foreground/50 text-sm italic pointer-events-none"
                                        aria-hidden="true"
                                    >
                                        {process.env.NEXT_PUBLIC_COMPANY_PORTAL_BASE_URL || '.localhost:3000'}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground/50 mt-1">Lowercase characters, numbers, and hyphens only.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-2.5 bg-muted hover:bg-secondary text-foreground rounded-lg font-medium transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                        >
                            {isLoading ? (
                                'Creating...'
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Create Tenant
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
