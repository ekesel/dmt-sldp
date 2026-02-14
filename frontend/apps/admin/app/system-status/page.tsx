'use client';
import React from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Activity, BarChart3, AlertTriangle } from 'lucide-react';
import { Badge } from '../components/UIComponents';

export default function SystemStatusPage() {
    const services = [
        { name: 'API Server', status: 'up', uptime: '99.98%', latency: '45ms', load: '32%' },
        { name: 'Database', status: 'up', uptime: '99.95%', latency: '8ms', load: '45%' },
        { name: 'Redis Cache', status: 'up', uptime: '100%', latency: '2ms', load: '12%' },
        { name: 'Celery Workers', status: 'up', uptime: '99.90%', latency: '120ms', load: '64%' },
        { name: 'Message Queue', status: 'up', uptime: '99.99%', latency: '25ms', load: '28%' },
        { name: 'WebSocket Server', status: 'up', uptime: '99.88%', latency: '52ms', load: '18%' },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">System Status</h1>
                    <p className="text-slate-400">Monitor all system services and performance.</p>
                </div>

                {/* System Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-semibold">Overall Status</h3>
                            <Activity className="w-5 h-5 text-green-400" />
                        </div>
                        <p className="text-3xl font-bold text-green-400">Healthy</p>
                        <p className="text-slate-400 text-sm mt-2">All systems operational</p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-semibold">Average Latency</h3>
                            <BarChart3 className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-3xl font-bold text-blue-400">45ms</p>
                        <p className="text-slate-400 text-sm mt-2">Network response time</p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-semibold">System Load</h3>
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        </div>
                        <p className="text-3xl font-bold text-yellow-400">40%</p>
                        <p className="text-slate-400 text-sm mt-2">Average CPU usage</p>
                    </div>
                </div>

                {/* Service Status Table */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-800">
                        <h2 className="text-lg font-semibold text-white">Service Status</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Service</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Uptime</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Latency</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Load</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {services.map((service) => (
                                    <tr key={service.name} className="hover:bg-slate-800/30 transition">
                                        <td className="px-6 py-4 font-medium text-white">{service.name}</td>
                                        <td className="px-6 py-4">
                                            <Badge label={service.status === 'up' ? 'Operational' : 'Down'} variant="success" />
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">{service.uptime}</td>
                                        <td className="px-6 py-4 text-slate-300">{service.latency}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" 
                                                        style={{ width: service.load }}
                                                    />
                                                </div>
                                                <span className="text-slate-300 text-sm min-w-10">{service.load}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
