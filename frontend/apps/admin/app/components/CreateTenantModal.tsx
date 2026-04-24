'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { tenants as tenantsApi } from '@dmt/api';

interface CreateTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function CreateTenantModal({ isOpen, onClose, onSuccess }: CreateTenantModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        schema_name: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await tenantsApi.create(formData);
            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create tenant');
        } finally {
            setLoading(false);
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        setFormData({
            ...formData,
            name,
            slug,
            schema_name: slug.replace(/-/g, '_'),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="bg-popover border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">Create New Tenant</h2>
                    <button 
                        onClick={onClose} 
                        aria-label="Close"
                        className="p-2 hover:bg-muted rounded-lg transition text-muted-foreground hover:text-foreground"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Company Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={handleNameChange}
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                            placeholder="Acme Corp"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Tenant Slug</label>
                        <input
                            type="text"
                            required
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                            placeholder="acme-corp"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Schema Name</label>
                        <input
                            type="text"
                            required
                            value={formData.schema_name}
                            onChange={(e) => setFormData({ ...formData, schema_name: e.target.value })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                            placeholder="acme_corp"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Tenant'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
