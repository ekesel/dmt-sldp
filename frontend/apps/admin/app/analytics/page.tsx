'use client';
import React from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
                    <p className="text-slate-400">View platform analytics and metrics.</p>
                </div>

                {/* Time Range Selector */}
                <div className="flex gap-2">
                    {['Today', 'This Week', 'This Month', 'This Year'].map((range) => (
                        <button 
                            key={range}
                            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition text-sm"
                        >
                            {range}
                        </button>
                    ))}
                </div>

                {/* Analytics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* API Requests Chart */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-white">API Requests</h2>
                                <p className="text-slate-400 text-sm mt-1">Total requests over time</p>
                            </div>
                            <BarChart3 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="h-64 flex items-center justify-center bg-slate-800/30 rounded-lg">
                            <p className="text-slate-500">Chart Coming Soon</p>
                        </div>
                    </div>

                    {/* User Growth Chart */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-white">User Growth</h2>
                                <p className="text-slate-400 text-sm mt-1">New users per month</p>
                            </div>
                            <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="h-64 flex items-center justify-center bg-slate-800/30 rounded-lg">
                            <p className="text-slate-500">Chart Coming Soon</p>
                        </div>
                    </div>

                    {/* Error Rate */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Error Rate</h2>
                                <p className="text-slate-400 text-sm mt-1">System errors and failures</p>
                            </div>
                            <Calendar className="w-5 h-5 text-orange-400" />
                        </div>
                        <div className="h-64 flex items-center justify-center bg-slate-800/30 rounded-lg">
                            <p className="text-slate-500">Chart Coming Soon</p>
                        </div>
                    </div>

                    {/* Database Performance */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-white">DB Performance</h2>
                                <p className="text-slate-400 text-sm mt-1">Query performance metrics</p>
                            </div>
                            <BarChart3 className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="h-64 flex items-center justify-center bg-slate-800/30 rounded-lg">
                            <p className="text-slate-500">Chart Coming Soon</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
