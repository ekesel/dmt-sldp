'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Users, Server, Activity, Zap, RefreshCw } from 'lucide-react';
import { health, tenants as tenantsApi, users as usersApi, dashboard as dashboardApi, activityLog as activityApi } from '@dmt/api';
import useSessionMonitor from '../../../app/hooks/useSessionMonitor';
import { DashboardLayout } from './components/DashboardLayout';
import { StatCard, Badge } from './components/UIComponents';
import { CreateTenantModal } from './components/CreateTenantModal';

export default function AdminHome() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [userCount, setUserCount] = useState<number>(0);
    const [metrics, setMetrics] = useState<any>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Session Monitoring
    const { isSessionValid } = useSessionMonitor({
        enabled: true,
        onLogout: () => {
            router.push('/auth/login');
        }
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        setRefreshing(true);

        try {
            const [healthData, userList, dashboardMetrics, logData] = await Promise.all([
                health.get(),
                usersApi.list(),
                dashboardApi.getMetrics(),
                activityApi.list()
            ]);

            setStats(healthData);
            setUserCount(userList?.length || 0);
            setMetrics(dashboardMetrics);
            setActivities(logData || []);
        } catch (err) {
            // Silently handle load errors as the UI handles empty states
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        // WebSocket Setup
        const token = localStorage.getItem('dmt-access-token');
        if (!token) return;

        const hostname = window.location.hostname;
        const wsUrl = `ws://${hostname}:8000/ws/admin/health/?token=${token}`;

        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
        };

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'initial_state') {
                const { health, user_count, activities } = message.data;
                setStats(health);
                setUserCount(user_count);
                setActivities(activities);
                setMetrics({ api_requests_count: health.api_requests_count });
                setLoading(false);
                setRefreshing(false);
            } else if (message.type === 'health_update') {
                setStats(message.data);
                if (message.data.api_requests_count !== undefined) {
                    setMetrics((prev: any) => ({
                        ...prev,
                        api_requests_count: message.data.api_requests_count
                    }));
                }
            } else if (message.type === 'activity_update') {
                setActivities(prev => [message.data, ...prev].slice(0, 10));
                // Also update metrics count if we can, but health_update will handle it
            }
        };

        socket.onclose = () => {
        };

        socket.onerror = () => {
            // Silently fallback to API if WS fails (already called fetchData once on mount)
        };

        return () => {
            socket.close();
        };
    }, [fetchData]);

    if (!isSessionValid) return null;

    const services = stats?.services || {
        database: 'down',
        redis: 'down',
        celery: 'down',
        api_gateway: 'down'
    };

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                    <p className="text-slate-400">Welcome to the DMT-SLDP Admin Portal. Manage tenants and system configurations.</p>
                </div>
                <button
                    onClick={() => fetchData()}
                    disabled={refreshing}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition flex items-center gap-2"
                >
                    <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                    <span className="text-sm font-medium">Refresh</span>
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard
                    icon={Building2}
                    title="Active Tenants"
                    value={loading ? '—' : stats?.active_tenants || 0}
                    description="Total registered companies"
                />

                <StatCard
                    icon={Users}
                    title="Total Users"
                    value={loading ? '—' : userCount}
                    description="Across all tenants"
                />

                <StatCard
                    icon={Zap}
                    title="System Load"
                    value={loading ? '—' : `${stats?.system_load || '0'}%`}
                    description="Current usage"
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
                    value={loading ? '—' : `${metrics?.api_requests_count || 0}`}
                    description="Total system logs"
                />
            </div>

            {/* System Health Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Services Status */}
                <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-6">Services Status</h2>
                    <div className="space-y-3">
                        {Object.entries(services).map(([name, status]) => (
                            <div key={name} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition">
                                <span className="text-slate-300 font-medium capitalize">{name.replace(/_/g, ' ')}</span>
                                <Badge label={status === 'up' ? 'Operational' : 'Down'} variant={status === 'up' ? 'success' : 'error'} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-6">Recent Activity</h2>
                    <div className="space-y-4">
                        {activities.length > 0 ? activities.map((activity, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition">
                                <div>
                                    <p className="text-slate-300 font-medium capitalize">{activity.action} {activity.entity_type}</p>
                                    <p className="text-xs text-slate-500">{activity.actor_name}</p>
                                </div>
                                <span className="text-xs text-slate-500">
                                    {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-slate-500 italic">No recent activity found.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 font-medium transition"
                    >
                        Create Tenant
                    </button>
                    <button
                        onClick={() => router.push('/users')}
                        className="px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 font-medium transition"
                    >
                        Manage Users
                    </button>
                    <button
                        onClick={() => router.push('/analytics')}
                        className="px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 font-medium transition"
                    >
                        View Reports
                    </button>
                    <button
                        onClick={() => router.push('/settings')}
                        className="px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 font-medium transition"
                    >
                        System Settings
                    </button>
                </div>
            </div>

            <CreateTenantModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => { }}
            />
        </DashboardLayout>
    );
}
