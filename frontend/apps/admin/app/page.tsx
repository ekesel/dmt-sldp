"use client";
import React, { useEffect, useState } from 'react';
import { Card, Button } from "@dmt/ui";
import { LayoutDashboard, Users, Settings, ShieldCheck, Activity } from "lucide-react";
import { health } from "@dmt/api";

export default function AdminHome() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        health.get()
            .then(data => setStats(data))
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="min-h-screen bg-brand-dark p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <ShieldCheck className="text-brand-primary" />
                            Platform Administration
                        </h1>
                        <p className="text-slate-400">Manage tenants and global system configurations.</p>
                    </div>
                    <Button>Create New Tenant</Button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="flex flex-col gap-4 bg-slate-900/50 border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-primary/20 rounded-lg">
                                <Users className="text-brand-primary" />
                            </div>
                            <h2 className="text-xl font-semibold">Active Tenants</h2>
                        </div>
                        {loading ? (
                            <div className="h-10 w-24 bg-slate-800 animate-pulse rounded" />
                        ) : (
                            <>
                                <p className="text-4xl font-bold">{stats?.active_tenants || 0}</p>
                                <p className="text-sm text-slate-400">Total registered companies</p>
                            </>
                        )}
                    </Card>

                    <Card className="flex flex-col gap-4 bg-slate-900/50 border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-accent/20 rounded-lg">
                                <LayoutDashboard className="text-brand-accent" />
                            </div>
                            <h2 className="text-xl font-semibold">System Health</h2>
                        </div>
                        {loading ? (
                            <div className="h-10 w-24 bg-slate-800 animate-pulse rounded" />
                        ) : (
                            <>
                                <p className="text-4xl font-bold text-brand-accent">{stats?.uptime || '99.9%'}</p>
                                <div className="flex items-center gap-2 mt-auto">
                                    <div className={`w-2 h-2 rounded-full ${stats?.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    <span className="text-sm text-slate-400 capitalize">{stats?.status || 'Unknown'}</span>
                                </div>
                            </>
                        )}
                    </Card>

                    <Card className="flex flex-col gap-4 bg-slate-900/50 border-slate-800 text-slate-300">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-500/20 rounded-lg">
                                <Activity className="text-slate-400" />
                            </div>
                            <h2 className="text-xl font-semibold">Services</h2>
                        </div>
                        <div className="space-y-2 mt-auto">
                            {['database', 'redis', 'celery'].map((svc) => (
                                <div key={svc} className="flex justify-between items-center text-sm">
                                    <span className="capitalize">{svc}</span>
                                    <span className="text-emerald-500 font-medium">Online</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </main>
    );
}
