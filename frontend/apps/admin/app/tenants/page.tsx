import { Card, Button } from "@dmt/ui";
import { tenants } from "@dmt/api";
import { Users, Plus, ExternalLink } from "lucide-react";
import React from 'react';

export default function TenantsPage() {
    // Static mock for now until dynamic loading hook is ready
    const mockTenants = [
        { id: '1', name: 'Acme Corp', slug: 'acme', status: 'Active', userCount: 42 },
        { id: '2', name: 'Globex', slug: 'globex', status: 'Active', userCount: 15 },
        { id: '3', name: 'Initech', slug: 'initech', status: 'Pending', userCount: 0 },
    ];

    return (
        <main className="min-h-screen bg-brand-dark p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <Users className="text-brand-primary" />
                            Tenant Management
                        </h1>
                        <p className="text-slate-400">View and manage all platform tenants.</p>
                    </div>
                    <Button className="flex items-center gap-2">
                        <Plus size={18} />
                        Add Tenant
                    </Button>
                </header>

                <div className="grid grid-cols-1 gap-4">
                    {mockTenants.map((t) => (
                        <Card key={t.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center font-bold text-brand-primary">
                                    {t.name[0]}
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{t.name}</h3>
                                    <p className="text-slate-400 text-sm">slug: {t.slug}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-12">
                                <div className="text-center">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider">Status</p>
                                    <p className={`${t.status === 'Active' ? 'text-emerald-400' : 'text-amber-400'} font-medium`}>{t.status}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider">Users</p>
                                    <p className="text-white font-medium">{t.userCount}</p>
                                </div>
                                <Button className="bg-slate-700 hover:bg-slate-600 p-2">
                                    <ExternalLink size={18} />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </main>
    );
}
