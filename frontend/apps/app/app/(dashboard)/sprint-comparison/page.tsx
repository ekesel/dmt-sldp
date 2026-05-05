"use client";
import React, { useState, useEffect } from 'react';
import { dashboard, developers } from '@dmt/api';
import { ProjectSelector } from '../../../components/ProjectSelector';
import { SprintSelector } from '../../../components/SprintSelector';
import { KPICard } from '../../../components/KPISection';
import { AlertTriangle, Users } from 'lucide-react';
import { RadarChartComponent } from '../../../components/charts/RadarChartComponent';
import { SideBySideBarChart } from '../../../components/charts/SideBySideBarChart';
import { BlockedTimeChart } from '../../../components/charts/BlockedTimeChart';
import WorkloadDistributionChart from '../../../components/charts/WorkloadDistributionChart';
import { HelpSidebar } from '../../../components/HelpSidebar';

export default function SprintComparisonPage() {
    const [projectId, setProjectId] = useState<number | null>(null);
    const [sprintAId, setSprintAId] = useState<number | null>(null);
    const [sprintAName, setSprintAName] = useState<string>('');
    const [sprintBId, setSprintBId] = useState<number | null>(null);
    const [sprintBName, setSprintBName] = useState<string>('');
    const [developerId, setDeveloperId] = useState<string | null>(null);
    const [devsList, setDevsList] = useState<any[]>([]);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [activeHelpId, setActiveHelpId] = useState<string | null>(null);

    const handleHelpClick = (id: string) => {
        setActiveHelpId(id);
        setIsHelpOpen(true);
    };

    // Fetch Developers list for the dropdown
    useEffect(() => {
        developers.list(projectId).then(setDevsList).catch(console.error);
    }, [projectId]);

    // Actually fetch the data whenever sprints change
    const [availableSprints, setAvailableSprints] = useState<any[]>([]);

    useEffect(() => {
        import('@dmt/api').then(({ sprints }) => {
            sprints.list(projectId).then(setAvailableSprints);
        });
    }, [projectId]);

    useEffect(() => {
        const sA = availableSprints.find(s => s.id === sprintAId);
        if (sA) setSprintAName(sA.name);
        const sB = availableSprints.find(s => s.id === sprintBId);
        if (sB) setSprintBName(sB.name);
    }, [sprintAId, sprintBId, availableSprints]);

    useEffect(() => {
        if (!sprintAName || !sprintBName) return;
        setLoading(true);
        dashboard.getSprintComparison(sprintAName, sprintBName, projectId, developerId)
            .then(res => setData(res))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [sprintAName, sprintBName, projectId, developerId]);

    return (
        <div className="flex flex-col gap-8 w-full min-h-screen bg-background pb-10 px-6">
            {/* Header / Sticky Filter */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border py-5 px-6 -mx-6 flex flex-wrap items-center justify-between gap-y-4 shadow-xl shadow-black/20 transition-all duration-300">
                <div className="flex items-center gap-6 flex-wrap">
                    <div className="font-bold text-xl text-foreground tracking-tight mr-2 border-r border-border pr-6">Sprint Comparison</div>

                    <div className="flex items-center gap-4 flex-wrap">
                        <ProjectSelector selectedProjectId={projectId} onSelect={(id) => { setProjectId(id); setSprintAId(null); setSprintBId(null); setDeveloperId(null); }} />

                        <div className="h-6 w-px bg-border hidden md:block" />

                        <div className="flex items-center gap-3 bg-muted/50 p-1.5 pr-3 rounded-lg border border-border">
                            <span className="text-xs font-bold text-muted-foreground uppercase ml-2">Baseline:</span>
                            <SprintSelector projectId={projectId} selectedSprintId={sprintAId} onSelect={setSprintAId} />
                        </div>

                        <div className="flex items-center gap-3 bg-muted/50 p-1.5 pr-3 rounded-lg border border-border">
                            <span className="text-xs font-bold text-muted-foreground uppercase ml-2">Target:</span>
                            <SprintSelector projectId={projectId} selectedSprintId={sprintBId} onSelect={setSprintBId} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-primary/10 p-1.5 pr-3 rounded-lg border border-primary/20">
                    <Users size={16} className="text-primary ml-2" />
                    <select
                        className="bg-transparent text-foreground/80 text-sm font-medium focus:outline-none"
                        value={developerId || ''}
                        onChange={(e) => setDeveloperId(e.target.value || null)}
                    >
                        <option value="" className="bg-popover">All Developers (Team View)</option>
                        {devsList.map(dev => (
                            <option key={dev.id} value={dev.id} className="bg-popover">{dev.developer_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content Container */}
            <div className="max-w-[1600px] mx-auto w-full flex flex-col gap-10">
                {!sprintAId || !sprintBId ? (
                    <div className="flex flex-col items-center justify-center p-24 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/50 my-10">
                        <div className="p-4 bg-muted/50 rounded-full mb-6 text-muted-foreground">
                            <AlertTriangle size={48} className="opacity-50" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground/80 mb-2">Comparison Pending</h2>
                        <p className="max-w-md text-center">Please select both a baseline and target sprint from the filters above to begin your analysis.</p>
                    </div>
                ) : loading || !data ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-40 bg-muted rounded-2xl border border-border" />)}
                    </div>
                ) : (
                    <div className="flex flex-col gap-12">
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
                            {Object.entries(data.kpis).map(([key, vals]: [string, any]) => {
                                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                                // Special formatting for item volume
                                const displayValue = key === 'item_volume'
                                    ? `${vals.sub_b} / ${vals.b}`
                                    : $(vals.b);

                                const baseValue = key === 'item_volume'
                                    ? `${vals.sub_a} / ${vals.a}`
                                    : $(vals.a);

                                return (
                                    <KPICard
                                        key={key}
                                        label={label}
                                        value={displayValue}
                                        trend={{
                                            value: typeof vals.variance === 'number' ? Math.abs(vals.variance).toFixed(1) + '%' : '0%',
                                            direction: vals.variance > 0 ? 'up' : vals.variance < 0 ? 'down' : 'neutral',
                                            sentiment: determineSentiment(key, vals.variance)
                                        }}
                                        description={
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-muted-foreground font-bold uppercase tracking-tighter text-[10px]">Baseline:</span>
                                                <span className="text-foreground/80 font-bold">{baseValue}</span>
                                                <span className="text-muted-foreground font-medium italic opacity-80">({sprintAName})</span>
                                            </div>
                                        }
                                        helpId={key === 'pr_review_speed' ? 'pr_health' : key}
                                        onHelpClick={handleHelpClick}
                                    />
                                );
                            })}
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <div className="bg-card p-8 rounded-3xl border border-border shadow-2xl">
                                <RadarChartComponent data={data.charts.radar} sprintA={sprintAName} sprintB={sprintBName} />
                            </div>

                            <div className="flex flex-col gap-8">
                                {data.charts.planned_vs_completed && data.charts.planned_vs_completed.length > 0 && (
                                    <div className="bg-card p-8 rounded-3xl border border-border shadow-2xl h-full flex flex-col justify-center">
                                        <SideBySideBarChart
                                            title="Planned vs Completed Points"
                                            data={data.charts.planned_vs_completed}
                                            keyA="planned"
                                            keyB="completed"
                                        />
                                    </div>
                                )}

                                {data.charts.blocked_time && data.charts.blocked_time.length > 0 && (
                                    <div className="bg-card p-8 rounded-3xl border border-border shadow-2xl h-full flex flex-col justify-center">
                                        <BlockedTimeChart
                                            data={data.charts.blocked_time}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Workload Distribution Section (Team Only) */}
                        {!developerId && data.charts.workload_distribution?.length > 0 && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                <div className="bg-card p-8 rounded-3xl border border-border shadow-2xl overflow-hidden">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-semibold text-foreground">Story Points Distribution</h3>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded">By Developer</span>
                                    </div>
                                    <WorkloadDistributionChart
                                        data={data.charts.workload_distribution}
                                        type="points"
                                        sprintAName={sprintAName}
                                        sprintBName={sprintBName}
                                    />
                                </div>

                                <div className="bg-card p-8 rounded-3xl border border-border shadow-2xl overflow-hidden">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-semibold text-foreground">Work Items Distribution</h3>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded">By Developer</span>
                                    </div>
                                    <WorkloadDistributionChart
                                        data={data.charts.workload_distribution}
                                        type="items"
                                        sprintAName={sprintAName}
                                        sprintBName={sprintBName}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <HelpSidebar
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
                activeTermId={activeHelpId}
            />
        </div>
    );
}

// Utility for formatting
function $(val: any) {
    if (typeof val === 'number') {
        const factor = val >= 1000 ? 1000 : 1;
        const formatted = factor === 1000 ? (val / 1000).toFixed(1) + 'k' : (Number.isInteger(val) ? val.toString() : val.toFixed(1));
        return formatted;
    }
    return val || '0';
}

function determineSentiment(key: string, variance: number): 'positive' | 'negative' | 'neutral' {
    if (Math.abs(variance) < 0.1) return 'neutral';
    const isPositiveGood = !['cycle_time', 'defect_density', 'pr_review_speed'].includes(key);
    if (isPositiveGood) {
        return variance > 0 ? 'positive' : 'negative';
    } else {
        return variance < 0 ? 'positive' : 'negative';
    }
}
