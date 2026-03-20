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
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                            <Database className="text-primary" />
                            Source Details: {sourceId}
                        </h1>
                        <p className="text-muted-foreground">Configure field mapping and data synchronization triggers.</p>
                    </div>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border rounded-lg transition font-medium">
                            <Search size={18} />
                            Trigger Field Discovery
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition font-medium">
                            <Play size={18} />
                            Trigger Sync
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-foreground">Field Mappings</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between p-3 bg-muted/30 rounded-lg border border-border italic text-muted-foreground text-sm font-medium">
                                Run Discovery to populate available fields...
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-foreground">Sync Status & Logs</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Current Phase:</span>
                                <span className="text-primary font-medium tracking-wide uppercase text-xs">Idle</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden" />
                            <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-success/80 h-48 overflow-y-auto border border-border shadow-inner">
                                {`[${new Date().toISOString()}] System ready for manual sync.`}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
