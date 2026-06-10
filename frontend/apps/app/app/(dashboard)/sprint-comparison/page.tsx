"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { dashboard, developers } from '@dmt/api';
import { ProjectSelector } from '../../../components/ProjectSelector';
import { SprintSelector } from '../../../components/SprintSelector';
import { KPICard } from '../../../components/KPISection';
import { AlertTriangle, Users, Building2 } from 'lucide-react';
import { RadarChartComponent } from '../../../components/charts/RadarChartComponent';
import { SideBySideBarChart } from '../../../components/charts/SideBySideBarChart';
import { BlockedTimeChart } from '../../../components/charts/BlockedTimeChart';
import WorkloadDistributionChart from '../../../components/charts/WorkloadDistributionChart';
import { HelpSidebar } from '../../../components/HelpSidebar';
import companyBaseline from '../../../constants/company-baseline.json';

export default function SprintComparisonPage() {
    const [projectId, setProjectId] = useState<number | null>(null);
    const [sprintAId, setSprintAId] = useState<number | null>(null);
    const [sprintAName, setSprintAName] = useState<string>('');
    const [sprintBId, setSprintBId] = useState<number | null>(null);
    const [sprintBName, setSprintBName] = useState<string>('');
    const [developerId, setDeveloperId] = useState<string | null>(null);
    const [devsList, setDevsList] = useState<any[]>([]);
    const [useCompanyBaseline, setUseCompanyBaseline] = useState(false);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [activeHelpId, setActiveHelpId] = useState<string | null>(null);

    const handleHelpClick = useCallback((id: string) => {
        setActiveHelpId(id);
        setIsHelpOpen(true);
    }, []);

    const handleProjectSelect = useCallback((id: number | null) => {
        setProjectId(id);
        setSprintAId(null);
        setSprintBId(null);
        setDeveloperId(null);
    }, []);

    const handleDeveloperChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setDeveloperId(e.target.value || null);
    }, []);

    const handleHelpClose = useCallback(() => {
        setIsHelpOpen(false);
    }, []);
    const handleBaselineModeToggle = useCallback((mode: 'sprint' | 'company') => {
        setUseCompanyBaseline(mode === 'company');
        setSprintAId(null);
        setSprintAName('');
        setData(null);
    }, []);

    useEffect(() => {
        developers.list(projectId).then(setDevsList).catch(console.error);
    }, [projectId]);

    const [availableSprints, setAvailableSprints] = useState<any[]>([]);

    useEffect(() => {
        import('@dmt/api').then(({ sprints }) => {
            sprints.list(projectId).then(setAvailableSprints);
        });
    }, [projectId]);

    useEffect(() => {
        const sA = availableSprints.find(s => s.id === sprintAId);
        setSprintAName(sA?.name || '');
        const sB = availableSprints.find(s => s.id === sprintBId);
        setSprintBName(sB?.name || '');
    }, [sprintAId, sprintBId, availableSprints]);

    const baselineReady = useCompanyBaseline ? !!sprintBName : !!sprintAName && !!sprintBName;

    useEffect(() => {
        if (!baselineReady || !sprintBName) return;

        setLoading(true);

        const fetchName = useCompanyBaseline ? sprintBName : sprintAName;

        dashboard.getSprintComparison(fetchName, sprintBName, projectId, developerId)
            .then(res => {
                if (useCompanyBaseline) {
                    setData(applyCompanyBaseline(res, companyBaseline));
                } else {
                    setData(res);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [sprintAName, sprintBName, projectId, developerId, useCompanyBaseline, baselineReady]);

    const effectiveBaselineName = useCompanyBaseline ? companyBaseline.name : sprintAName;
    const pendingSelection = useCompanyBaseline ? !sprintBId : (!sprintAId || !sprintBId);

    return (
        <div className="flex flex-col gap-8 w-full min-h-screen bg-background pb-10 px-6">
            {/* Header / Sticky Filter */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border py-5 px-6 -mx-6 flex flex-wrap items-center justify-between gap-y-4 shadow-xl shadow-black/20 transition-all duration-300">
                <div className="flex items-center gap-6 flex-wrap">
                    <div className="font-bold text-xl text-foreground tracking-tight mr-2 border-r border-border pr-6">Sprint Comparison</div>

                    <div className="flex items-center gap-4 flex-wrap">
                        <ProjectSelector selectedProjectId={projectId} onSelect={handleProjectSelect} />

                        <div className="h-6 w-px bg-border hidden md:block" />

                        {/* Baseline selector with mode toggle */}
                        <div className="flex items-center gap-3 bg-muted/50 p-1 pr-1.5 rounded-lg border border-border h-10">
                            <span className="text-xs font-bold text-muted-foreground uppercase ml-2">Baseline:</span>

                            {/* Mode toggle pills */}
                            <div className="flex items-center bg-background rounded-md border border-border overflow-hidden h-8">
                                <button
                                    onClick={() => handleBaselineModeToggle('sprint')}
                                    className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                                        !useCompanyBaseline
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Sprint
                                </button>
                                <button
                                    onClick={() => handleBaselineModeToggle('company')}
                                    className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors flex items-center gap-1 ${
                                        useCompanyBaseline
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Building2 size={11} />
                                    Company
                                </button>
                            </div>

                            {useCompanyBaseline ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded border border-primary/20 h-8">
                                    <Building2 size={12} className="text-primary" />
                                    <span className="text-xs font-bold text-primary">{companyBaseline.name}</span>
                                </div>
                            ) : (
                                <SprintSelector projectId={projectId} selectedSprintId={sprintAId} onSelect={setSprintAId} className="px-3 h-8 text-xs" />
                            )}
                        </div>

                        <div className="flex items-center gap-3 bg-muted/50 p-1 pr-1.5 rounded-lg border border-border h-10">
                            <span className="text-xs font-bold text-muted-foreground uppercase ml-2">Target:</span>
                            <SprintSelector projectId={projectId} selectedSprintId={sprintBId} onSelect={setSprintBId} className="px-3 h-8 text-xs" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-primary/10 px-3 rounded-lg border border-primary/20 h-10">
                    <Users size={16} className="text-primary ml-1" />
                    <select
                        className="bg-transparent text-foreground/80 text-sm font-medium focus:outline-none"
                        value={developerId || ''}
                        onChange={handleDeveloperChange}
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
                {pendingSelection ? (
                    <div className="flex flex-col items-center justify-center p-24 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/50 my-10">
                        <div className="p-4 bg-muted/50 rounded-full mb-6 text-muted-foreground">
                            <AlertTriangle size={48} className="opacity-50" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground/80 mb-2">Comparison Pending</h2>
                        <p className="max-w-md text-center">
                            {useCompanyBaseline
                                ? 'Please select a target sprint to compare against the Company Baseline.'
                                : 'Please select both a baseline and target sprint from the filters above to begin your analysis.'}
                        </p>
                    </div>
                ) : loading || !data ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-40 bg-muted rounded-2xl border border-border" />)}
                    </div>
                ) : (
                    <div className="flex flex-col gap-12">
                        {useCompanyBaseline && (
                            <div className="flex items-center gap-3 px-5 py-3 bg-primary/5 border border-primary/20 rounded-xl text-sm text-muted-foreground">
                                <Building2 size={16} className="text-primary shrink-0" />
                                <span>Comparing <strong className="text-foreground">{sprintBName}</strong> against the <strong className="text-foreground">{companyBaseline.name}</strong>. {companyBaseline.description}</span>
                            </div>
                        )}

                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                            {Object.entries(data.kpis).map(([key, vals]: [string, any]) => {
                                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

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
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {useCompanyBaseline && <Building2 size={10} className="text-primary shrink-0" />}
                                                <span className="text-muted-foreground font-bold uppercase tracking-tighter text-[10px]">Baseline:</span>
                                                <span className="text-foreground/80 font-bold">{baseValue}</span>
                                                <span className="text-muted-foreground font-medium italic opacity-80">({effectiveBaselineName})</span>
                                            </div>
                                        }
                                        valueClassName="text-accent !text-2xl"
                                        className="border-2 border-primary hover:ring-2 hover:ring-inset hover:ring-primary bg-none backdrop-blur-none shadow-md text-center [&>div.flex]:justify-center"
                                        labelClassName="font-bold text-base whitespace-nowrap text-primary"
                                        helpId={key === 'pr_review_speed' ? 'pr_health' : key}
                                        onHelpClick={handleHelpClick}
                                    />
                                );
                            })}
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <div className="bg-card p-8 rounded-3xl border border-border shadow-2xl">
                                <RadarChartComponent data={data.charts.radar} sprintA={effectiveBaselineName} sprintB={sprintBName} />
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
                                        sprintAName={effectiveBaselineName}
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
                                        sprintAName={effectiveBaselineName}
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
                onClose={handleHelpClose}
                activeTermId={activeHelpId}
            />
        </div>
    );
}

function applyCompanyBaseline(apiData: any, baseline: typeof companyBaseline): any {
    const result = { ...apiData, kpis: {} as Record<string, any> };

    for (const [key, vals] of Object.entries(apiData.kpis) as [string, any][]) {
        const bVal = vals.b ?? vals.a;

        if (key === 'item_volume') {
            const baseTotal = baseline.kpis.item_volume?.total ?? vals.a;
            const baseCompleted = baseline.kpis.item_volume?.completed ?? vals.sub_a;
            const variance = baseCompleted !== 0 ? ((vals.sub_b - baseCompleted) / Math.abs(baseCompleted)) * 100 : 0;
            result.kpis[key] = { a: baseTotal, sub_a: baseCompleted, b: vals.b, sub_b: vals.sub_b, variance };
        } else {
            const baseVal = (baseline.kpis as any)[key] ?? vals.a;
            const variance = baseVal !== 0 ? ((bVal - baseVal) / Math.abs(baseVal)) * 100 : 0;
            result.kpis[key] = { a: baseVal, b: bVal, variance };
        }
    }

    return result;
}

function $(val: any) {
    if (typeof val === 'number') {
        const formatted = val >= 1000 ? (val / 1000).toFixed(1) + 'k' : (Number.isInteger(val) ? val.toString() : val.toFixed(1));
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
