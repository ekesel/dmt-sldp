"use client";
import React, { useEffect, useState } from 'react';
import { Card } from "@dmt/ui";
import { User, TrendingUp, ArrowLeft, BarChart3 } from "lucide-react";
import { VelocityChart } from "../../components/charts/VelocityChart";
import { useParams, useRouter } from 'next/navigation';

interface DeveloperMetrics {
    sprint_name: string;
    story_points_completed: number;
    tasks_completed: number;
    bugs_fixed: number;
    dmt_compliance_rate: number;
    pr_review_count: number;
}

export default function DeveloperDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [metrics, setMetrics] = useState<DeveloperMetrics[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const fetchMetrics = async () => {
            try {
                const response = await fetch(`/api/developers/${id}/metrics/`);
                if (response.ok) {
                    const data = await response.json();
                    setMetrics(data);
                }
            } catch (error) {
                console.error("Failed to fetch developer metrics", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [id]);

    const velocityData = metrics.map(m => ({
        sprint_name: m.sprint_name,
        velocity: m.story_points_completed,
        total_story_points_completed: m.story_points_completed // redundant for chart but matches interface
    }));

    if (loading) return <div className="min-h-screen bg-brand-dark p-8 text-white">Loading...</div>;

    return (
        <main className="min-h-screen bg-brand-dark p-8 selection:bg-brand-primary/30">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col gap-6 border-b border-white/5 pb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit"
                    >
                        <ArrowLeft size={16} />
                        Back to Team
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-brand-primary text-sm font-bold tracking-wider uppercase mb-2">
                            <User size={16} />
                            Developer Profile
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                            {id}
                            {/* In a real app we'd fetch the name separately or include it in metrics response */}
                        </h1>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-slate-900/40 border-white/5 flex flex-col gap-2">
                        <span className="text-slate-400 text-sm font-bold uppercase">Avg Velocity</span>
                        <span className="text-3xl font-bold text-white">
                            {metrics.length > 0
                                ? Math.round(metrics.reduce((acc, curr) => acc + curr.story_points_completed, 0) / metrics.length)
                                : 0} SP
                        </span>
                    </Card>
                    <Card className="p-6 bg-slate-900/40 border-white/5 flex flex-col gap-2">
                        <span className="text-slate-400 text-sm font-bold uppercase">Compliance Rate</span>
                        <span className={`text-3xl font-bold ${(metrics[0]?.dmt_compliance_rate || 0) >= 80 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                            {metrics[0]?.dmt_compliance_rate || 0}%
                        </span>
                    </Card>
                    <Card className="p-6 bg-slate-900/40 border-white/5 flex flex-col gap-2">
                        <span className="text-slate-400 text-sm font-bold uppercase">PR Reviews</span>
                        <span className="text-3xl font-bold text-white">
                            {metrics[0]?.pr_review_count || 0}
                        </span>
                    </Card>
                </div>

                <Card className="min-h-[450px] flex flex-col p-8 bg-slate-900/40 border-white/5 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <BarChart3 className="text-brand-primary" />
                                Performance Trend
                            </h2>
                        </div>
                    </div>
                    <div className="flex-1 w-full bg-slate-800/10 rounded-2xl border border-white/5 p-4">
                        <VelocityChart data={velocityData} />
                    </div>
                </Card>
            </div>
        </main>
    );
}
