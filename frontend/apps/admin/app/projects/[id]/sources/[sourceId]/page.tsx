'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { RefreshCw, Search, Database, Play } from "lucide-react";
import { DashboardLayout } from '../../../../components/DashboardLayout';

export default function SourceDetailPage() {
    const params = useParams();
    const sourceId = params.sourceId as string;

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <Database className="text-blue-500" />
                            Source Details: {sourceId}
                        </h1>
                        <p className="text-slate-400">Configure field mapping and data synchronization triggers.</p>
                    </div>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 rounded-lg transition font-medium">
                            <Search size={18} />
                            Trigger Field Discovery
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-medium">
                            <Play size={18} />
                            Trigger Sync
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-white">Field Mappings</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-800 italic text-slate-500 text-sm font-medium">
                                Run Discovery to populate available fields...
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-white">Sync Status & Logs</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Current Phase:</span>
                                <span className="text-blue-400 font-medium tracking-wide uppercase text-xs">Idle</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden" />
                            <div className="bg-black/40 rounded-lg p-4 font-mono text-xs text-emerald-400/70 h-48 overflow-y-auto border border-slate-800 shadow-inner">
                                {`[${new Date().toISOString()}] System ready for manual sync.`}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
