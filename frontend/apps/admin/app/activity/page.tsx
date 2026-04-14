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
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        <span className="text-sm">Back</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                            <History className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">System Audit Trail</h1>
                    </div>
                    <p className="text-muted-foreground mt-2">Comprehensive log of all administrative actions and system events across the platform.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-secondary-foreground transition">
                        <Filter size={16} />
                        <span className="text-sm font-medium">Filter Logs</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-primary transition cursor-not-allowed" title="Coming soon">
                        <span className="text-sm font-medium">Export CSV</span>
                    </button>
                </div>
            </div>

            <ActivityLog limit={20} className="mt-8" />

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-card/50 border border-border rounded-xl">
                    <h3 className="text-foreground font-bold mb-2">Audit Compliance</h3>
                    <p className="text-muted-foreground text-sm">All entries are immutable and timestamped with the originating IP address for SOC2/ISO compliance.</p>
                </div>
                <div className="p-6 bg-card/50 border border-border rounded-xl">
                    <h3 className="text-foreground font-bold mb-2">Retention Policy</h3>
                    <p className="text-muted-foreground text-sm">Logs are currently retained for 12 months as per the global system retention policy.</p>
                </div>
            </div>
        </DashboardLayout>
    );
}
