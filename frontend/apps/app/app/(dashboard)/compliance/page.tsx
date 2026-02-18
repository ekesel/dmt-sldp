"use client";
import React, { useEffect, useState } from 'react';
import { Card } from "@dmt/ui";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface ComplianceFlag {
    id: string; // {item_id}-{type}
    work_item_id: string;
    work_item_title: string;
    flag_type: string;
    severity: 'critical' | 'warning';
    created_at: string;
}

export default function CompliancePage() {
    const [flags, setFlags] = useState<ComplianceFlag[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFlags = async () => {
        try {
            const response = await fetch('/api/compliance-flags/');
            if (response.ok) {
                const data = await response.json();
                setFlags(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFlags();
    }, []);

    const resolveFlag = async (flagId: string) => {
        try {
            const response = await fetch(`/api/compliance-flags/${flagId}/resolve/`, {
                method: 'POST'
            });
            if (response.ok) {
                // Remove from list or mark resolved
                setFlags(prev => prev.filter(f => f.id !== flagId));
            }
        } catch (error) {
            console.error("Failed to resolve flag", error);
        }
    };

    return (
        <main className="min-h-screen bg-brand-dark p-8 selection:bg-brand-primary/30">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-end border-b border-white/5 pb-8">
                    <div>
                        <div className="flex items-center gap-2 text-rose-500 text-sm font-bold tracking-wider uppercase mb-2">
                            <AlertCircle size={16} />
                            Governance
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                            Compliance Flags
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">Active DMT violations requiring attention.</p>
                    </div>
                </header>

                <div className="grid gap-4">
                    {loading ? (
                        <p className="text-slate-400">Loading...</p>
                    ) : flags.length === 0 ? (
                        <div className="p-8 text-center bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                            <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
                            <h3 className="text-xl font-bold text-white">All Clear</h3>
                            <p className="text-emerald-200/60 mt-2">No active compliance flags found.</p>
                        </div>
                    ) : (
                        flags.map((flag) => (
                            <Card key={flag.id} className="p-6 bg-slate-900/40 border-white/5 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${flag.severity === 'critical' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-black'
                                            }`}>
                                            {flag.severity}
                                        </span>
                                        <span className="text-slate-400 text-xs font-mono">{flag.created_at}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white">{flag.work_item_title}</h3>
                                    <p className="text-slate-400 text-sm">Violation: {flag.flag_type}</p>
                                </div>
                                <button
                                    onClick={() => resolveFlag(flag.id)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors"
                                >
                                    Resolve
                                </button>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
