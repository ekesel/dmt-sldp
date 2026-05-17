"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { Card } from "@dmt/ui";
import { AlertCircle, CheckCircle, User, Calendar, Folder, ShieldCheck, Activity, CheckCircle2, HelpCircle, Clock } from "lucide-react";
import { compliance } from '@dmt/api';
import { ProjectSelector } from "../../../components/ProjectSelector";
import { SprintSelector } from "../../../components/SprintSelector";
import { ActiveFolderSelector } from "../../../components/ActiveFolderSelector";
import { HelpSidebar } from "../../../components/HelpSidebar";

interface ComplianceFlag {
    id: string;
    work_item_id: string;
    work_item_title: string;
    flag_type: string;
    severity: 'critical' | 'warning';
    created_at: string;
    project_name: string;
    assignee_name: string;
    assignee_names: string[];
    responsible_role: string | null;
    responsible_name: string | null;
}

interface ComplianceSummary {
    overall_health: number;
    critical_count: number;
    warning_count: number;
    total_items: number;
    compliant_items: number;
}

const FLAG_TYPE_LABELS: Record<string, string> = {
    'missing_ac_quality': 'AC Quality Missing',
    'unit_testing_not_done': 'Unit Testing Required',
    'low_coverage': 'Coverage Below Threshold',
    'missing_pr_link': 'Missing PR Link',
    'missing_ci_evidence': 'CI Evidence Missing',
    'missing_signoff': 'DMT Signoff Missing'
};

export default function CompliancePage() {
    const [flags, setFlags] = useState<ComplianceFlag[]>([]);
    const [summary, setSummary] = useState<ComplianceSummary | null>(null);
    const [fixedLaterItems, setFixedLaterItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [fixedLaterLoading, setFixedLaterLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

    const [activeFilter, setActiveFilter] = useState<'critical' | 'warning' | null>(null);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [activeHelpId, setActiveHelpId] = useState<string | null>(null);

    const toggleFilter = useCallback((f: 'critical' | 'warning') => {
        setActiveFilter(prev => prev === f ? null : f);
    }, []);

    const handleHelpClick = useCallback((id: string) => {
        setActiveHelpId(id);
        setIsHelpOpen(true);
    }, []);

    const handleCloseHelp = useCallback(() => {
        setIsHelpOpen(false);
    }, []);

    const fetchData = useCallback((projectId: number | null, sprintId: number | null) => {
        setLoading(true);
        setSummaryLoading(true);
        setFixedLaterLoading(true);

        compliance.listFlags(projectId, sprintId)
            .then(data => setFlags(data))
            .catch(err => console.error("Failed to fetch compliance flags:", err))
            .finally(() => setLoading(false));

        compliance.getSummary(projectId, sprintId)
            .then(data => setSummary(data))
            .catch(err => console.error("Failed to fetch compliance summary:", err))
            .finally(() => setSummaryLoading(false));

        compliance.listFixedLater(projectId, sprintId)
            .then(data => setFixedLaterItems(data))
            .catch(err => console.error("Failed to fetch fixed-later items:", err))
            .finally(() => setFixedLaterLoading(false));
    }, []);

    // Refetch whenever project OR sprint changes
    useEffect(() => {
        fetchData(selectedProjectId, selectedSprintId);
    }, [selectedProjectId, selectedSprintId, fetchData]);

    // When project changes, SprintSelector auto-selects latest sprint via onSelect callback
    const handleProjectChange = useCallback((projectId: number | null) => {
        setSelectedProjectId(projectId);
        // Sprint will be reset by SprintSelector internally via onSelect
    }, []);

    const formatDateTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }).format(date);
        } catch (e) {
            return dateString;
        }
    };

    const KpiSkeleton = () => (
        <div className="h-10 w-24 bg-muted rounded-lg animate-pulse" />
    );

    return (
        <main className="min-h-screen bg-background p-8 selection:bg-primary/30">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-end border-b border-border pb-8">
                    <div>
                        <div className="flex items-center gap-2 text-destructive text-sm font-bold tracking-wider uppercase mb-2">
                            <AlertCircle size={16} />
                            Governance
                        </div>
                        <h1 className="text-4xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
                            Compliance Flags
                            <button
                                onClick={(e) => { e.stopPropagation(); handleHelpClick('dmt_rules'); }}
                                className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none mt-2"
                                title="Learn more about DMT compliance rules"
                            >
                                <HelpCircle size={24} />
                            </button>
                        </h1>
                        <p className="text-muted-foreground mt-2 font-medium">Active DMT violations requiring attention across your projects.</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                        <SprintSelector
                            projectId={selectedProjectId}
                            selectedSprintId={selectedSprintId}
                            onSelect={setSelectedSprintId}
                        />
                        <ProjectSelector
                            selectedProjectId={selectedProjectId}
                            onSelect={handleProjectChange}
                        />
                        <ActiveFolderSelector
                            projectId={selectedProjectId}
                            onFolderChanged={() => {
                                fetchData(selectedProjectId, selectedSprintId);
                            }}
                        />
                    </div>
                </header>

                {/* KPI Overview — all data from backend /api/compliance-summary/ */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="p-6 bg-card border-border hover:border-emerald-500/30 transition-all duration-300 group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                <ShieldCheck size={20} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Overall Health</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleHelpClick('dmt_compliance'); }}
                                    className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none"
                                    title="Learn more about this metric"
                                >
                                    <HelpCircle size={16} />
                                </button>
                            </div>
                        </div>
                        {summaryLoading ? <KpiSkeleton /> : (
                            <div className="text-3xl font-black text-foreground">
                                {summary?.overall_health ?? '—'}<span className="text-sm text-emerald-500/50 -ml-0.5">%</span>
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Project compliance rate</p>
                    </Card>

                    <div
                        onClick={() => toggleFilter('critical')}
                        className="cursor-pointer select-none"
                    >
                    <Card className={`p-6 bg-card transition-all duration-300 group ${
                        activeFilter === 'critical'
                            ? 'border-destructive ring-2 ring-destructive/30 shadow-lg'
                            : 'border-border hover:border-destructive/50'
                    }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/20">
                                <AlertCircle size={20} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Critical</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleHelpClick('critical_violations'); }}
                                    className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none"
                                    title="Learn more about this metric"
                                >
                                    <HelpCircle size={16} />
                                </button>
                            </div>
                        </div>
                        {summaryLoading ? <KpiSkeleton /> : (
                            <div className="text-3xl font-black text-destructive">
                                {summary?.critical_count ?? flags.filter(f => f.severity === 'critical').length}
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">
                            {activeFilter === 'critical' ? 'Click to clear filter' : 'Click to filter'}
                        </p>
                    </Card>
                    </div>

                    <div
                        onClick={() => toggleFilter('warning')}
                        className="cursor-pointer select-none"
                    >
                    <Card className={`p-6 bg-card transition-all duration-300 group ${
                        activeFilter === 'warning'
                            ? 'border-warning ring-2 ring-warning/30 shadow-lg'
                            : 'border-border hover:border-warning/50'
                    }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning border border-warning/20">
                                <Activity size={20} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Warnings</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleHelpClick('warnings'); }}
                                    className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none"
                                    title="Learn more about this metric"
                                >
                                    <HelpCircle size={16} />
                                </button>
                            </div>
                        </div>
                        {summaryLoading ? <KpiSkeleton /> : (
                            <div className="text-3xl font-black text-warning">
                                {summary?.warning_count ?? flags.filter(f => f.severity === 'warning').length}
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">
                            {activeFilter === 'warning' ? 'Click to clear filter' : 'Click to filter'}
                        </p>
                    </Card>
                    </div>

                    <Card className="p-6 bg-card border-border hover:border-primary/30 transition-all duration-300 group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <CheckCircle2 size={20} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compliant Items</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleHelpClick('compliant_items'); }}
                                    className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none"
                                    title="Learn more about this metric"
                                >
                                    <HelpCircle size={16} />
                                </button>
                            </div>
                        </div>
                        {summaryLoading ? <KpiSkeleton /> : (
                            <div className="text-3xl font-black text-foreground">
                                {summary?.compliant_items ?? '—'}
                                {summary && (
                                    <span className="text-sm text-muted-foreground font-medium ml-1">/ {summary.total_items}</span>
                                )}
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Work items passing DMT</p>
                    </Card>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black flex items-center gap-3 text-foreground/90">
                            <Activity size={20} className="text-primary" />
                            Active Violations
                            {activeFilter && (
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                    activeFilter === 'critical'
                                        ? 'bg-destructive/10 text-destructive border-destructive/30'
                                        : 'bg-warning/10 text-warning border-warning/30'
                                }`}>
                                    {activeFilter === 'critical' ? 'Critical only' : 'Warnings only'}
                                </span>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleHelpClick('active_violations'); }}
                                className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none"
                                title="Learn more about this section"
                            >
                                <HelpCircle size={16} />
                            </button>
                        </h2>
                        {activeFilter && (
                            <button
                                onClick={() => setActiveFilter(null)}
                                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-foreground/30 bg-muted"
                            >
                                Clear filter
                            </button>
                        )}
                    </div>
                    <div className="grid gap-4">
                        {loading ? (
                            <div className="flex flex-col gap-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 w-full bg-muted border border-border rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : flags.length === 0 ? (
                            <div className="p-12 text-center bg-emerald-500/5 rounded-3xl border border-emerald-500/20 shadow-inner">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                                    <CheckCircle className="text-emerald-500" size={32} />
                                </div>
                                <h3 className="text-xl font-black text-foreground tracking-tight">Compliance Maintained</h3>
                                <p className="text-emerald-200/60 mt-2 font-medium">No active compliance violations detected for this context.</p>
                            </div>
                        ) : (() => {
                            const visibleFlags = activeFilter ? flags.filter(f => f.severity === activeFilter) : flags;
                            if (visibleFlags.length === 0) return (
                                <div className="p-8 text-center bg-muted/30 rounded-2xl border border-border">
                                    <p className="text-muted-foreground text-sm font-medium">
                                        No {activeFilter} violations in this sprint.
                                    </p>
                                </div>
                            );
                            return visibleFlags.map((flag) => (
                                <Card key={flag.id} className="p-6 bg-card border-border hover:bg-accent/50 transition-all group rounded-2xl">
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${flag.severity === 'critical' ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'
                                                }`}>
                                                {flag.severity}
                                            </span>
                                            {!selectedProjectId && (
                                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-wider border border-border">
                                                    <Folder size={10} />
                                                    {flag.project_name}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-tight bg-muted px-3 py-1 rounded-full">
                                                <Calendar size={12} className="text-primary" />
                                                {formatDateTime(flag.created_at)}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors tracking-tight">{flag.work_item_title}</h3>
                                            <p className="text-muted-foreground text-sm mt-1.5 font-medium flex items-center gap-2">
                                                Violation: <span className="text-foreground font-bold bg-muted px-2 py-0.5 rounded border border-border">{FLAG_TYPE_LABELS[flag.flag_type] || flag.flag_type}</span>
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {(flag.assignee_names?.length ? flag.assignee_names : [flag.assignee_name]).map((name, i) => (
                                                <div key={i} className="flex items-center gap-2 text-muted-foreground text-xs bg-muted/50 px-3 py-1.5 rounded-xl border border-border shadow-inner">
                                                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                                                        <User size={10} className="text-primary" />
                                                    </div>
                                                    <span className="font-bold text-foreground/80">{name}</span>
                                                </div>
                                            ))}
                                            {flag.responsible_name && (
                                                <div className="flex items-center gap-2 text-muted-foreground text-xs bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 shadow-inner">
                                                    <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                        <User size={10} className="text-amber-500" />
                                                    </div>
                                                    <span className="font-bold text-foreground/80">Responsible {flag.responsible_role}: <span className="text-amber-600 dark:text-amber-400">{flag.responsible_name}</span></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))
                        })()}
                    </div>
                </div>
                {/* Fixed Later Section */}
                <div className="space-y-4 mt-10">
                    <h2 className="text-xl font-black flex items-center gap-3 text-foreground/90">
                        <Clock size={20} className="text-emerald-500" />
                        Fixed Later
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                            Items that had violations but are now compliant
                        </span>
                    </h2>
                    <div className="grid gap-4">
                        {fixedLaterLoading ? (
                            <div className="flex flex-col gap-4">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-20 w-full bg-muted border border-border rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : fixedLaterItems.length === 0 ? (
                            <div className="p-8 text-center bg-muted/30 rounded-2xl border border-border">
                                <p className="text-muted-foreground text-sm font-medium">No items with cleared violations in this sprint.</p>
                            </div>
                        ) : (
                            fixedLaterItems.map((item) => (
                                <Card key={item.id} className="p-5 bg-card border-emerald-500/20 hover:bg-accent/30 transition-all group rounded-2xl">
                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                                            Fixed Later
                                        </span>
                                        {!selectedProjectId && (
                                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-wider border border-border">
                                                <Folder size={10} />
                                                {item.project_name}
                                            </span>
                                        )}
                                        {item.violations_cleared_at && (
                                            <span className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-tight bg-muted px-3 py-1 rounded-full">
                                                <CheckCircle size={12} className="text-emerald-500" />
                                                Cleared {formatDateTime(item.violations_cleared_at)}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-base font-black text-foreground group-hover:text-emerald-500 transition-colors tracking-tight">
                                        {item.work_item_title}
                                    </h3>
                                    {item.violation_history?.length > 0 && (
                                        <p className="text-muted-foreground text-xs mt-1.5 font-medium">
                                            Had {item.violation_history.length} violation period{item.violation_history.length > 1 ? 's' : ''} &mdash;{' '}
                                            {item.violation_history[item.violation_history.length - 1]?.failures?.map((f: string) =>
                                                FLAG_TYPE_LABELS[f] || f
                                            ).join(', ')}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 text-muted-foreground text-xs bg-muted/50 w-fit px-4 py-2 rounded-xl border border-border shadow-inner mt-3">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                            <User size={12} className="text-emerald-500" />
                                        </div>
                                        <span className="font-bold text-foreground/80">{item.assignee_name}</span>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <HelpSidebar
                isOpen={isHelpOpen}
                onClose={handleCloseHelp}
                activeTermId={activeHelpId}
            />
        </main>
    );
}
