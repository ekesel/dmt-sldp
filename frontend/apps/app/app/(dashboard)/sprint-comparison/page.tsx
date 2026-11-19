"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { dashboard, developers, companyBaseline } from '@dmt/api';
import { ProjectSelector } from '../../../components/ProjectSelector';
import { SprintSelector } from '../../../components/SprintSelector';
import { KPICard } from '../../../components/KPISection';
import { AlertTriangle, Users, Building2 } from 'lucide-react';
import { SprintHealthBarChart } from '../../../components/charts/SprintHealthBarChart';
import { SideBySideBarChart } from '../../../components/charts/SideBySideBarChart';
import { BlockedTimeChart } from '../../../components/charts/BlockedTimeChart';
import WorkloadDistributionChart, { WorkloadData } from '../../../components/charts/WorkloadDistributionChart';
import { HelpSidebar } from '../../../components/HelpSidebar';

export interface CompanyBaselineData {
    name: string;
    description?: string;
    last_updated?: string;
    kpis: {
        item_volume?: {
            total: number;
            completed: number;
        };
        [key: string]: number | { total: number; completed: number } | undefined;
    };
}

export interface KPIData {
    a: number;
    sub_a?: number;
    b?: number;
    sub_b?: number;
    variance?: number;
}

export interface SprintComparisonData {
    kpis: Record<string, KPIData>;
    charts: {
        radar: unknown[];
        sideBySide?: unknown[];
        blockedTime?: unknown[];
        workload?: unknown[];
        planned_vs_completed?: unknown[];
        blocked_time?: unknown[];
        workload_distribution?: WorkloadData[];
    };
    [key: string]: unknown;
}
export default function SprintComparisonPage() {
    const [baselineData, setBaselineData] = useState<CompanyBaselineData | null>(null);

    useEffect(() => {
        companyBaseline.getBaseline().then(res => {
            if (res && res.data) setBaselineData(res.data);
        }).catch(console.error);
    }, []);

    const [projectId, setProjectId] = useState<number | null>(null);
    const [sprintAId, setSprintAId] = useState<number | null>(null);
    const [sprintAName, setSprintAName] = useState<string>('');
    const [sprintBId, setSprintBId] = useState<number | null>(null);
    const [sprintBName, setSprintBName] = useState<string>('');
    const [developerId, setDeveloperId] = useState<string | null>(null);
    const [devsList, setDevsList] = useState<Array<{ id: string; developer_name: string; [key: string]: unknown }>>([]);
    const [useCompanyBaseline, setUseCompanyBaseline] = useState(false);

    const [data, setData] = useState<SprintComparisonData | null>(null);
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

    const [availableSprints, setAvailableSprints] = useState<Array<{ id: number; name: string; [key: string]: unknown }>>([]);

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
        if (!baselineReady || !sprintBName || (useCompanyBaseline && !baselineData)) return;

        setLoading(true);

        const fetchName = useCompanyBaseline ? sprintBName : sprintAName;

        dashboard.getSprintComparison(fetchName, sprintBName, projectId, developerId)
            .then(res => {
                if (useCompanyBaseline) {
                    setData(applyCompanyBaseline(res, baselineData));
                } else {
                    setData(res);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [sprintAName, sprintBName, projectId, developerId, useCompanyBaseline, baselineReady, baselineData]);

    const effectiveBaselineName = useCompanyBaseline ? (baselineData?.name || 'Company Baseline') : sprintAName;
    const pendingSelection = useCompanyBaseline ? !sprintBId : (!sprintAId || !sprintBId);

    return (
        <div className="flex flex-col gap-6 sm:gap-8 w-full min-h-full bg-background pb-12 sm:pb-16 px-2.5 sm:px-6 overflow-x-hidden">
            {/* Header / Sticky Filter */}
            <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border py-3 sm:py-4 px-2.5 sm:px-6 -mx-2.5 sm:-mx-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 flex-wrap w-full md:w-auto">
                    <div className="font-bold text-base sm:text-lg lg:text-xl text-foreground tracking-tight border-b sm:border-b-0 sm:border-r border-border pb-1.5 sm:pb-0 sm:pr-4 shrink-0">
                        Sprint Comparison
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto flex-1 sm:flex-initial">
                        <ProjectSelector
                            selectedProjectId={projectId}
                            onSelect={handleProjectSelect}
                            className="w-full sm:w-auto flex-1 sm:flex-initial min-w-0"
                            buttonClassName="w-full sm:w-48 lg:w-56 h-10"
                        />

                        {/* Baseline selector with mode toggle */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 bg-muted/50 p-2 sm:p-1 sm:pr-1.5 rounded-lg border border-border w-full sm:w-auto">
                            <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0 w-full sm:w-auto">
                                <span className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase ml-0.5 sm:ml-1.5 shrink-0">Baseline:</span>

                                {/* Mode toggle pills */}
                                <div className="flex items-center bg-background rounded-md border border-border overflow-hidden h-7 sm:h-8 shrink-0">
                                    <button
                                        onClick={() => handleBaselineModeToggle('sprint')}
                                        className={`px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                                            !useCompanyBaseline
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Sprint
                                    </button>
                                    <button
                                        onClick={() => handleBaselineModeToggle('company')}
                                        className={`px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide transition-colors flex items-center gap-1 cursor-pointer ${
                                            useCompanyBaseline
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <Building2 size={11} />
                                        Company
                                    </button>
                                </div>
                            </div>

                            {useCompanyBaseline ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-md border border-primary/20 min-h-9 sm:min-h-8 h-auto w-full sm:w-auto min-w-0 justify-center sm:justify-start">
                                    <Building2 size={13} className="text-primary shrink-0" />
                                    <span className="text-xs font-bold text-primary break-words whitespace-normal leading-snug">{baselineData?.name || 'Company Baseline'}</span>
                                </div>
                            ) : (
                                <div className="w-full sm:w-auto flex-1 sm:flex-initial min-w-0">
                                    <SprintSelector
                                        projectId={projectId}
                                        selectedSprintId={sprintAId}
                                        onSelect={setSprintAId}
                                        className="px-3 h-9 sm:h-8 text-xs w-full sm:w-44"
                                        wrapperClassName="w-full sm:w-auto"
                                        popoverAlign="left"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Target selector */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 bg-muted/50 p-2 sm:p-1 sm:pr-1.5 rounded-lg border border-border w-full sm:w-auto flex-1 sm:flex-initial">
                            <span className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase ml-0.5 sm:ml-1.5 shrink-0">Target:</span>
                            <div className="w-full sm:w-auto flex-1 sm:flex-initial min-w-0">
                                <SprintSelector
                                    projectId={projectId}
                                    selectedSprintId={sprintBId}
                                    onSelect={setSprintBId}
                                    className="px-3 h-9 sm:h-8 text-xs w-full sm:w-44"
                                    wrapperClassName="w-full sm:w-auto"
                                    popoverAlign="left"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-primary/10 px-3 rounded-lg border border-primary/20 h-10 w-full md:w-auto shrink-0">
                    <Users size={16} className="text-primary shrink-0" />
                    <select
                        className="bg-transparent text-foreground/80 text-xs sm:text-sm font-medium focus:outline-none cursor-pointer w-full md:w-auto truncate"
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
            <div className="max-w-[1600px] mx-auto w-full flex flex-col gap-8 sm:gap-10">
                {pendingSelection ? (
                    <div className="flex flex-col items-center justify-center p-8 sm:p-16 lg:p-24 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/50 my-6 sm:my-10 text-center">
                        <div className="p-3.5 sm:p-4 bg-muted/50 rounded-full mb-4 sm:mb-6 text-muted-foreground">
                            <AlertTriangle size={36} className="opacity-50 sm:w-12 sm:h-12" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-semibold text-foreground/80 mb-2">Comparison Pending</h2>
                        <p className="max-w-md text-center text-xs sm:text-sm">
                            {useCompanyBaseline
                                ? 'Please select a target sprint to compare against the Company Baseline.'
                                : 'Please select both a baseline and target sprint from the filters above to begin your analysis.'}
                        </p>
                    </div>
                ) : loading || !data ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-36 sm:h-40 bg-muted rounded-xl sm:rounded-2xl border border-border" />)}
                    </div>
                ) : (
                    <div className="flex flex-col gap-8 sm:gap-12">


                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                            {Object.entries(data.kpis).map(([key, vals]: [string, KPIData]) => {
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
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap text-[10px] sm:text-xs">
                                                {useCompanyBaseline && <Building2 size={10} className="text-primary shrink-0" />}
                                                <span className="text-muted-foreground font-bold uppercase tracking-tighter text-[10px]">Baseline:</span>
                                                <span className="text-foreground/80 font-bold">{baseValue}</span>
                                                <span className="text-muted-foreground font-medium italic opacity-80 break-words whitespace-normal">({effectiveBaselineName})</span>
                                            </div>
                                        }
                                        valueClassName="text-accent !text-xl sm:!text-2xl font-black"
                                        className="border-2 border-primary hover:ring-2 hover:ring-inset hover:ring-primary bg-none backdrop-blur-none shadow-md text-center [&>div.flex]:justify-center min-w-0 p-3 sm:p-4"
                                        labelClassName="font-bold text-xs sm:text-sm lg:text-base break-words text-primary justify-center text-center"
                                        helpId={key === 'pr_review_speed' ? 'pr_health' : key === 'code_ai_usage' ? 'objective_ai' : key}
                                        onHelpClick={handleHelpClick}
                                    />
                                );
                            })}
                        </div>

                        {/* Charts Grid */}
                        <div className="flex flex-col gap-5 sm:gap-8 min-w-0 w-full max-w-full">
                            <div className="bg-card p-3.5 sm:p-6 lg:p-8 rounded-xl sm:rounded-3xl border border-border w-full min-w-0 overflow-hidden">
                                <SprintHealthBarChart data={data.charts.radar} sprintA={effectiveBaselineName} sprintB={sprintBName} />
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-8 min-w-0 w-full">
                                {data.charts.planned_vs_completed && data.charts.planned_vs_completed.length > 0 && (
                                    <div className="bg-card p-3.5 sm:p-6 lg:p-8 rounded-xl sm:rounded-3xl border border-border h-full flex flex-col justify-center min-w-0 overflow-hidden">
                                        <SideBySideBarChart
                                            title="Planned vs Completed Points"
                                            data={data.charts.planned_vs_completed}
                                            keyA="planned"
                                            keyB="completed"
                                        />
                                    </div>
                                )}

                                {data.charts.blocked_time && data.charts.blocked_time.length > 0 && (
                                    <div className="bg-card p-3.5 sm:p-6 lg:p-8 rounded-xl sm:rounded-3xl border border-border h-full flex flex-col justify-center min-w-0 overflow-hidden">
                                        <BlockedTimeChart
                                            data={data.charts.blocked_time}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Workload Distribution Section (Team Only) */}
                        {!developerId && (data.charts.workload_distribution?.length ?? 0) > 0 && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-8 min-w-0 w-full">
                                <div className="bg-card p-3.5 sm:p-6 lg:p-8 rounded-xl sm:rounded-3xl border border-border overflow-hidden min-w-0">
                                    <div className="flex justify-between items-center mb-3.5 sm:mb-6 flex-wrap gap-2">
                                        <h3 className="text-sm sm:text-lg font-semibold text-foreground">Story Points Distribution</h3>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 sm:py-1 rounded shrink-0">By Developer</span>
                                    </div>
                                    <WorkloadDistributionChart
                                        data={data.charts.workload_distribution!}
                                        type="points"
                                        sprintAName={effectiveBaselineName}
                                        sprintBName={sprintBName}
                                    />
                                </div>

                                <div className="bg-card p-3.5 sm:p-6 lg:p-8 rounded-xl sm:rounded-3xl border border-border overflow-hidden min-w-0">
                                    <div className="flex justify-between items-center mb-3.5 sm:mb-6 flex-wrap gap-2">
                                        <h3 className="text-sm sm:text-lg font-semibold text-foreground">Work Items Distribution</h3>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 sm:py-1 rounded shrink-0">By Developer</span>
                                    </div>
                                    <WorkloadDistributionChart
                                        data={data.charts.workload_distribution!}
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

function applyCompanyBaseline(apiData: SprintComparisonData, baseline: CompanyBaselineData): SprintComparisonData {
    const result: SprintComparisonData = { ...apiData, kpis: {} };

    for (const [key, vals] of Object.entries(apiData.kpis)) {
        const bVal = vals.b ?? vals.a;

        if (key === 'item_volume') {
            const baseTotal = baseline.kpis.item_volume?.total ?? vals.a;
            const baseCompleted = baseline.kpis.item_volume?.completed ?? vals.sub_a ?? 0;
            const variance = baseCompleted !== 0 && vals.sub_b !== undefined ? ((vals.sub_b - baseCompleted) / Math.abs(baseCompleted)) * 100 : 0;
            result.kpis[key] = { a: baseTotal, sub_a: baseCompleted, b: vals.b, sub_b: vals.sub_b, variance };
        } else {
            const baseVal = (baseline.kpis[key] as number) ?? vals.a;
            const variance = baseVal !== 0 ? ((bVal - baseVal) / Math.abs(baseVal)) * 100 : 0;
            result.kpis[key] = { a: baseVal, b: bVal, variance };
        }
    }

    return result;
}

function $(val: number | string | undefined | null) {
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
