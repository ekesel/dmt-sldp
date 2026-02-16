'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { History, ArrowLeft, Filter } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ActivityLog } from '../components/ActivityLog';

export default function ActivityLogPage() {
    const router = useRouter();

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-500 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        <span className="text-sm">Back</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <History className="w-6 h-6 text-blue-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">System Audit Trail</h1>
                    </div>
                    <p className="text-slate-400 mt-2">Comprehensive log of all administrative actions and system events across the platform.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition">
                        <Filter size={16} />
                        <span className="text-sm font-medium">Filter Logs</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 transition cursor-not-allowed" title="Coming soon">
                        <span className="text-sm font-medium">Export CSV</span>
                    </button>
                </div>
            </div>

            <ActivityLog limit={20} className="mt-8" />

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <h3 className="text-white font-bold mb-2">Audit Compliance</h3>
                    <p className="text-slate-400 text-sm">All entries are immutable and timestamped with the originating IP address for SOC2/ISO compliance.</p>
                </div>
                <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <h3 className="text-white font-bold mb-2">Retention Policy</h3>
                    <p className="text-slate-400 text-sm">Logs are currently retained for 12 months as per the global system retention policy.</p>
                </div>
            </div>
        </DashboardLayout>
    );
}
