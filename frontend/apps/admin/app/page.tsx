'use client';
import React, { useEffect, useState } from 'react';
import { Building2, Users, Server, Activity, Zap } from 'lucide-react';
import { health } from '@dmt/api';
import { DashboardLayout } from './components/DashboardLayout';
import { StatCard, Badge } from './components/UIComponents';

export default function AdminHome() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        health.get()
            .then(data => setStats(data))
            .catch(err => console.error('Error loading health:', err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-slate-400">Welcome to the DMT-SLDP Admin Portal. Manage tenants and system configurations.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard
                    icon={Building2}
                    title="Active Tenants"
                    value={loading ? '—' : stats?.active_tenants || 0}
                    description="Total registered companies"
                    trend={loading ? undefined : { value: 12, isPositive: true }}
                />

                <StatCard
                    icon={Users}
                    title="Total Users"
                    value={loading ? '—' : '0'}
                    description="Across all tenants"
                />

                <StatCard
                    icon={Zap}
                    title="System Load"
                    value={loading ? '—' : '34%'}
                    description="Current usage"
                    trend={loading ? undefined : { value: 5, isPositive: false }}
                />

                <StatCard
                    icon={Server}
                    title="Uptime"
                    value={loading ? '—' : stats?.uptime || '99.9%'}
                    description="Last 30 days"
                />

                <StatCard
                    icon={Activity}
                    title="API Requests"
                    value={loading ? '—' : '524.8K'}
                    description="This month"
                    trend={loading ? undefined : { value: 23, isPositive: true }}
                />
            </div>

            {/* System Health Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Services Status */}
                <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-6">Services Status</h2>
                    <div className="space-y-3">
                        {[
                            { name: 'Database', status: 'up' },
                            { name: 'Redis Cache', status: 'up' },
                            { name: 'Celery Workers', status: 'up' },
                            { name: 'API Gateway', status: 'up' },
                        ].map((service) => (
                            <div key={service.name} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition">
                                <span className="text-slate-300 font-medium">{service.name}</span>
                                <Badge label={service.status === 'up' ? 'Operational' : 'Down'} variant={service.status === 'up' ? 'success' : 'error'} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-6">Recent Activity</h2>
                    <div className="space-y-4">
                        {[
                            { action: 'New tenant created', user: 'System Admin', time: '2 minutes ago' },
                            { action: 'Backup completed', user: 'Automation', time: '1 hour ago' },
                            { action: 'Database migration', user: 'DevOps Team', time: '3 hours ago' },
                            { action: 'Security audit', user: 'Admin Panel', time: '5 hours ago' },
                        ].map((activity, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition">
                                <div>
                                    <p className="text-slate-300 font-medium">{activity.action}</p>
                                    <p className="text-xs text-slate-500">{activity.user}</p>
                                </div>
                                <span className="text-xs text-slate-500">{activity.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button className="px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 font-medium transition">
                        Create Tenant
                    </button>
                    <button className="px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 font-medium transition">
                        Manage Users
                    </button>
                    <button className="px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 font-medium transition">
                        View Reports
                    </button>
                    <button className="px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 font-medium transition">
                        System Settings
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
