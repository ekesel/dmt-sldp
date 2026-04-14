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
                    <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
                    <p className="text-muted-foreground">View platform analytics and metrics.</p>
                </div>

                {/* Time Range Selector */}
                <div className="flex gap-2">
                    {['Today', 'This Week', 'This Month', 'This Year'].map((range) => (
                        <button 
                            key={range}
                            className="px-4 py-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground font-medium transition text-sm"
                        >
                            {range}
                        </button>
                    ))}
                </div>

                {/* Analytics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* API Requests Chart */}
                    <div className="bg-card/50 border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">API Requests</h2>
                                <p className="text-muted-foreground text-sm mt-1">Total requests over time</p>
                            </div>
                            <BarChart3 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                            <p className="text-muted-foreground">Chart Coming Soon</p>
                        </div>
                    </div>

                    {/* User Growth Chart */}
                    <div className="bg-card/50 border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">User Growth</h2>
                                <p className="text-muted-foreground text-sm mt-1">New users per month</p>
                            </div>
                            <TrendingUp className="w-5 h-5 text-success" />
                        </div>
                        <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                            <p className="text-muted-foreground">Chart Coming Soon</p>
                        </div>
                    </div>

                    {/* Error Rate */}
                    <div className="bg-card/50 border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Error Rate</h2>
                                <p className="text-muted-foreground text-sm mt-1">System errors and failures</p>
                            </div>
                            <Calendar className="w-5 h-5 text-warning" />
                        </div>
                        <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                            <p className="text-muted-foreground">Chart Coming Soon</p>
                        </div>
                    </div>

                    {/* Database Performance */}
                    <div className="bg-card/50 border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">DB Performance</h2>
                                <p className="text-muted-foreground text-sm mt-1">Query performance metrics</p>
                            </div>
                            <BarChart3 className="w-5 h-5 text-info" />
                        </div>
                        <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                            <p className="text-muted-foreground">Chart Coming Soon</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
