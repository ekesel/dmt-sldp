'use client';
import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Activity, BarChart3, AlertTriangle, RefreshCcw, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '../components/UIComponents';
import { health as apiHealth } from '@dmt/api';
import { toast } from 'react-hot-toast';

interface ServiceStatus {
    [key: string]: 'up' | 'down' | 'degraded';
}

interface HealthData {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: string;
    system_load: number;
    services: ServiceStatus;
    active_tenants?: number;
    api_requests_count?: number;
}

export default function SystemStatusPage() {
    const [loading, setLoading] = useState(true);
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const wsRef = useRef<WebSocket | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initial fetch
    useEffect(() => {
        fetchHealth();
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    // WebSocket Connection
    useEffect(() => {
        connectWebSocket();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    // Polling fallback: only poll if Auto-refresh is ON and WebSocket is OFF
    useEffect(() => {
        if (autoRefresh && !wsConnected) {
            pollIntervalRef.current = setInterval(fetchHealth, 10000); // Poll every 10s
        } else {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [autoRefresh, wsConnected]);

    const connectWebSocket = () => {
        const token = localStorage.getItem('dmt-access-token');
        if (!token) {
            console.error('No access token found for WebSocket');
            toast.error('Authentication missing for live updates');
            setWsConnected(false);
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use environment variable if provided, otherwise fallback to port 8000 on current hostname
        const baseUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.hostname}:8000/ws/admin/health/`;
        const wsUrl = `${baseUrl}${baseUrl.endsWith('/') ? '' : '/'}?token=${token}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Connected to Health WebSocket');
            setWsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'initial_state') {
                    // Initial state has health nested, and other stats
                    if (message.data.health) {
                        setHealthData(message.data.health);
                    }
                    setLastUpdated(new Date());
                    setLoading(false);
                } else if (message.type === 'health_update') {
                    // Periodic updates are flat health stats
                    setHealthData(message.data);
                    setLastUpdated(new Date());
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error parsing WS message:', error);
            }
        };

        ws.onclose = () => {
            console.log('Health WebSocket disconnected');
            setWsConnected(false);
            // Attempt reconnect after 5s
            setTimeout(() => {
                if (wsRef.current?.readyState === WebSocket.CLOSED) {
                    connectWebSocket();
                }
            }, 5000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
            setWsConnected(false);
        };

        wsRef.current = ws;
    };

    const fetchHealth = async () => {
        try {
            const data = await apiHealth.get();
            if (data && data.services) {
                setHealthData(data as any);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch health data:', error);
            // Don't show toast on every poll failure, maybe only manual?
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'up':
                return 'text-green-500 dark:text-green-400';
            case 'degraded':
                return 'text-yellow-500 dark:text-yellow-400';
            case 'down':
            case 'unhealthy':
                return 'text-red-500 dark:text-red-400';
            default:
                return 'text-slate-500 dark:text-slate-400';
        }
    };

    // Helper to format service names
    const formatServiceName = (name: string) => {
        return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (loading && !healthData) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <RefreshCcw className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">System Status</h1>
                        <p className="text-slate-500 dark:text-slate-400">Monitor all system services and performance.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            {wsConnected ? (
                                <span className="flex items-center gap-1 text-green-500 text-xs bg-green-500/10 px-2 py-1 rounded-full">
                                    <Wifi size={14} /> Live Updates
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-amber-500 text-xs bg-amber-500/10 px-2 py-1 rounded-full">
                                    <WifiOff size={14} /> Reconnecting...
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                            <span className="text-xs px-2 text-slate-500 dark:text-slate-400">Auto-refresh</span>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`w-10 h-5 rounded-full relative transition-colors ${autoRefresh ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${autoRefresh ? 'left-5.5' : 'left-0.5'}`} />
                            </button>
                        </div>
                        <button
                            onClick={fetchHealth}
                            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition"
                            title="Refresh Now"
                        >
                            <RefreshCcw size={18} />
                        </button>
                    </div>
                </div>

                {healthData && (
                    <>
                        {/* System Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-none">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-slate-700 dark:text-white font-semibold">Overall Status</h3>
                                    <Activity className={`w-5 h-5 ${getStatusColor(healthData.status)}`} />
                                </div>
                                <p className={`text-3xl font-bold ${getStatusColor(healthData.status)}`}>
                                    {healthData.status === 'healthy' ? 'Healthy' : healthData.status === 'degraded' ? 'Degraded' : 'Unhealthy'}
                                </p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                                    {healthData.status === 'healthy' ? 'All systems operational' : 'Some services are down'}
                                </p>
                            </div>

                            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-none">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-slate-700 dark:text-white font-semibold">Uptime</h3>
                                    <BarChart3 className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                </div>
                                <p className="text-3xl font-bold text-blue-500 dark:text-blue-400">{healthData.uptime}</p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Since last restart</p>
                            </div>

                            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-none">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-slate-700 dark:text-white font-semibold">System Load</h3>
                                    <AlertTriangle className={`w-5 h-5 ${healthData.system_load > 80 ? 'text-red-500' : healthData.system_load > 50 ? 'text-yellow-500' : 'text-green-500'}`} />
                                </div>
                                <p className={`text-3xl font-bold ${healthData.system_load > 80 ? 'text-red-500' : healthData.system_load > 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                                    {healthData.system_load}%
                                </p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Average CPU usage</p>
                            </div>
                        </div>

                        {/* Service Status Table */}
                        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Service Status</h2>
                                <span className="text-xs text-slate-400">
                                    Last updated: {lastUpdated?.toLocaleTimeString()}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Service</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Status</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Metric</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {Object.entries(healthData.services || {}).map(([name, status]) => (
                                            <tr key={name} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                                <td className="px-6 py-4 font-medium text-slate-800 dark:text-white capitalize">
                                                    {formatServiceName(name)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge
                                                        label={status === 'up' ? 'Operational' : 'Down'}
                                                        variant={status === 'up' ? 'success' : 'error'}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                                                    {status === 'up' ? 'OK' : 'Check Logs'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
