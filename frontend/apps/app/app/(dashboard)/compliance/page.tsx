"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from "@dmt/ui";
import { AlertCircle, CheckCircle, User, Calendar, Folder, ShieldCheck, Activity, CheckCircle2, HelpCircle, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { compliance } from '@dmt/api';
import { ProjectSelector } from "../../../components/ProjectSelector";
import { SprintSelector } from "../../../components/SprintSelector";
import { ActiveFolderSelector } from "../../../components/ActiveFolderSelector";
import { HelpSidebar } from "../../../components/HelpSidebar";
import { toast } from 'react-hot-toast';

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
    fixed_later?: boolean;
    violations_cleared_at?: string | null;
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
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [activeHelpId, setActiveHelpId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'critical' | 'warning' | null>(null);

    const searchParams = useSearchParams();
    const workItemId = searchParams?.get('work_item_id');
    const paramProjectId = searchParams?.get('project_id');
    const paramSprintId = searchParams?.get('sprint_id');
    const paramPage = searchParams?.get('page');
    const paramPageSize = searchParams?.get('page_size');
    const nTitle = searchParams?.get('n_title') || '';
    const nMessage = searchParams?.get('n_message') || '';
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(paramProjectId ? Number(paramProjectId) : null);
    const [selectedSprintId, setSelectedSprintId] = useState<number | null>(paramSprintId ? Number(paramSprintId) : null);
    const [currentPage, setCurrentPage] = useState<number>(paramPage ? Number(paramPage) : 1);
    const [pageSize, setPageSize] = useState<number>(paramPageSize ? Number(paramPageSize) : 10);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalCount, setTotalCount] = useState<number>(0);

    const toggleFilter = useCallback((f: 'critical' | 'warning') => {
        setActiveFilter(prev => prev === f ? null : f);
        setCurrentPage(1);
    }, []);
    const handleHelpClick = useCallback((id: string) => {
        setActiveHelpId(id);
        setIsHelpOpen(true);
    }, []);

    const handleCloseHelp = useCallback(() => {
        setIsHelpOpen(false);
    }, []);

    const requestCounter = React.useRef(0);

    const fetchData = useCallback((projectId: number | null, sprintId: number | null, workItemId: string | null = null, page: number = 1, pageSize: number = 10, severity: 'critical' | 'warning' | null = null) => {
        const currentRequestId = ++requestCounter.current;

        setLoading(true);
        setSummaryLoading(true);

        // Always use workItemId if provided in URL to ensure the specific flag is fetched
        const effectiveWorkItemId = workItemId;
        compliance.listFlags(projectId, sprintId, effectiveWorkItemId, page, pageSize, severity)
            .then(res => {
                if (requestCounter.current === currentRequestId) {
                    if (res && res.data && Array.isArray(res.data)) {
                        setFlags(res.data);
                        setTotalPages(res.total_pages || 1);
                        setTotalCount(res.total_count || res.data.length);
                    } else if (Array.isArray(res)) {
                        setFlags(res);
                        setTotalPages(1);
                        setTotalCount(res.length);
                    } else {
                        setFlags([]);
                        setTotalPages(1);
                        setTotalCount(0);
                    }
                }
            })
            .catch(err => {
                console.error("Failed to fetch compliance flags:", err);
                toast.error("Failed to load compliance flags");
            })
            .finally(() => {
                if (requestCounter.current === currentRequestId) setLoading(false);
            });

        compliance.getSummary(projectId, sprintId)
            .then(data => {
                if (requestCounter.current === currentRequestId) setSummary(data);
            })
            .catch(err => {
                console.error("Failed to fetch compliance summary:", err);
                toast.error("Failed to load compliance summary");
            })
            .finally(() => {
                if (requestCounter.current === currentRequestId) setSummaryLoading(false);
            });

    }, []);

    // Refetch whenever project, sprint, activeFilter, page, or page size changes
    useEffect(() => {
        fetchData(selectedProjectId, selectedSprintId, workItemId, currentPage, pageSize, activeFilter);
    }, [selectedProjectId, selectedSprintId, workItemId, currentPage, pageSize, activeFilter, fetchData]);

    useEffect(() => {
        setSelectedProjectId(paramProjectId ? Number(paramProjectId) : null);
        setSelectedSprintId(paramSprintId ? Number(paramSprintId) : null);
        if (paramPage) setCurrentPage(Number(paramPage));
        if (paramPageSize) setPageSize(Number(paramPageSize));
        if (workItemId) {
            setActiveFilter(null);
        }
    }, [workItemId, paramProjectId, paramSprintId, paramPage, paramPageSize]);

    // Scroll to specific work item if provided in URL
    useEffect(() => {
        let scrollTimer: number | null = null;
        let classRemovalTimer: number | null = null;
        let retryCount = 0;

        const attemptScroll = () => {
            if (loading) return;

            // First try strict match by workItemId
            let targetFlag = flags.find(f => f.work_item_id?.toString() === workItemId);

            // If strict match fails, try matching by notification title or message (case-insensitive and robust)
            if (!targetFlag && (nTitle || nMessage)) {
                const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                const sNTitle = sanitize(nTitle);
                const sNMessage = sanitize(nMessage);

                const matchFlag = (f: ComplianceFlag) => {
                    const sTitle = sanitize(f.work_item_title);
                    return sTitle.length > 3 && (sNTitle.includes(sTitle) || sNMessage.includes(sTitle));
                };

                targetFlag = flags.find(matchFlag);
            }

            // Also try to find by extracting any numbers from the notification title
            if (!targetFlag && nTitle) {
                const numbersInTitle = nTitle.match(/\d+/g);
                if (numbersInTitle) {
                    const extractedId = numbersInTitle[0];
                    targetFlag = flags.find(f => f.work_item_title.includes(extractedId));
                }
            }

            const searchId = targetFlag ? targetFlag.work_item_id : workItemId;
            let element = document.getElementById(`work-item-${searchId}`);
            if (!element) {
                // Try finding by prefix
                element = document.querySelector(`[id^="work-item-${searchId}"]`) as HTMLElement;
            }
            if (!element) {
                // Try finding anywhere in id
                element = document.querySelector(`[id*="${searchId}"]`) as HTMLElement;
            }

            if (element) {
                console.log(`[Compliance] Element found for ${searchId}, scrolling...`);
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('!bg-accent/20', '!border-accent', 'ring-4', 'ring-accent/50', 'shadow-2xl', 'scale-[1.02]', 'transition-all', 'duration-500');

                classRemovalTimer = window.setTimeout(() => {
                    if (element) {
                        element.classList.remove('!bg-accent/20', '!border-accent', 'ring-4', 'ring-accent/50', 'shadow-2xl', 'scale-[1.02]');
                    }
                }, 4000);
            } else if (retryCount < 6) { // Retry up to 6 times (3 seconds)
                retryCount++;
                console.log(`[Compliance] Element not found for ${searchId}, retrying (${retryCount}/6)...`);
                scrollTimer = window.setTimeout(attemptScroll, 500);
            }
        };

        if (workItemId && !loading) {
            scrollTimer = window.setTimeout(attemptScroll, 500);
        }

        return () => {
            if (scrollTimer) window.clearTimeout(scrollTimer);
            if (classRemovalTimer) window.clearTimeout(classRemovalTimer);
        };
    }, [loading, flags, workItemId, nTitle, nMessage]);

    // When project changes, SprintSelector auto-selects latest sprint via onSelect callback
    const handleProjectChange = useCallback((projectId: number | null) => {
        setSelectedProjectId(projectId);
        setCurrentPage(1);
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
                        {selectedProjectId !== null && (
                            <SprintSelector
                                projectId={selectedProjectId}
                                selectedSprintId={selectedSprintId}
                                onSelect={(sprintId) => {
                                    setSelectedSprintId(sprintId);
                                    setCurrentPage(1);
                                }}
                                autoSelectLatest={!workItemId && !paramSprintId}
                            />
                        )}
                        <ProjectSelector
                            selectedProjectId={selectedProjectId}
                            onSelect={handleProjectChange}
                        />
                        <ActiveFolderSelector
                            projectId={selectedProjectId}
                            onFolderChanged={() => {
                                setCurrentPage(1);
                                fetchData(selectedProjectId, selectedSprintId, workItemId, 1, pageSize, activeFilter);
                            }}
                        />
                    </div>
                </header>

                {/* KPI Overview — all data from backend /api/compliance-summary/ */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="p-6 bg-card border-2 border-primary hover:ring-2 hover:ring-inset hover:ring-primary shadow-md transition-all duration-300 group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center text-green border border-green/20">
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
                                {summary?.overall_health ?? '—'}<span className="text-sm text-green/50 -ml-0.5">%</span>
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Project compliance rate</p>
                    </Card>

                    <div
                        onClick={() => toggleFilter('critical')}
                        className="cursor-pointer select-none"
                    >
                        <Card className={`p-6 bg-card transition-all duration-300 group ${activeFilter === 'critical'
                            ? 'border-destructive ring-2 ring-destructive/30 shadow-lg'
                            : 'border-2 border-primary hover:ring-2 hover:ring-inset hover:ring-primary shadow-md'
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
                        <Card className={`p-6 bg-card transition-all duration-300 group ${activeFilter === 'warning'
                            ? 'border-warning ring-2 ring-warning/30 shadow-lg'
                            : 'border-2 border-primary hover:ring-2 hover:ring-inset hover:ring-primary shadow-md'
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

                    <Card className="p-6 bg-card border-2 border-primary hover:ring-2 hover:ring-inset hover:ring-primary shadow-md transition-all duration-300 group">
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
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${activeFilter === 'critical'
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
                                onClick={() => {
                                    setActiveFilter(null);
                                    setCurrentPage(1);
                                }}
                                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-foreground/30 bg-muted"
                            >
                                Clear filter
                            </button>
                        )}
                    </div>
                    <div className="grid gap-4 max-h-[650px] overflow-y-auto pr-2">
                        {loading ? (
                            <div className="flex flex-col gap-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 w-full bg-muted border border-border rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : flags.length === 0 ? (
                            activeFilter ? (
                                <div className="p-8 text-center bg-muted/30 rounded-2xl border border-border">
                                    <p className="text-muted-foreground text-sm font-medium">
                                        No {activeFilter} violations in this sprint.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-12 text-center bg-green/5 rounded-3xl border border-green/20 shadow-inner">
                                    <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green/20">
                                        <CheckCircle className="text-green" size={32} />
                                    </div>
                                    <h3 className="text-xl font-black text-foreground tracking-tight">Compliance Maintained</h3>
                                    <p className="text-emerald-200/60 mt-2 font-medium">No active compliance violations detected for this context.</p>
                                </div>
                            )
                        ) : (() => {
                            return flags.map((flag) => (
                                <Card key={flag.id} id={`work-item-${flag.work_item_id}-${flag.id}`} className="p-6 bg-card border-2 border-primary hover:ring-2 hover:ring-inset hover:ring-primary shadow-md transition-all group rounded-2xl">
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${flag.severity === 'critical' ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'
                                                }`}>
                                                {flag.severity}
                                            </span>
                                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-wider border border-border">
                                                <Folder size={10} />
                                                {flag.project_name}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-tight bg-muted px-3 py-1 rounded-full">
                                                <Calendar size={12} className="text-primary" />
                                                {formatDateTime(flag.created_at)}
                                            </span>
                                            {flag.fixed_later && flag.violations_cleared_at && (
                                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight bg-green text-white px-3 py-1 rounded-full border border-green shadow-sm">
                                                    <CheckCircle size={12} />
                                                    Fixed: {formatDateTime(flag.violations_cleared_at)}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-primary transition-colors tracking-tight">{flag.work_item_title}</h3>
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

                {/* Pagination Controls */}
                {!loading && (totalPages > 1 || totalCount > 10) && (
                    <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-6 bg-card border border-border rounded-xl mt-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Rows per page</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-muted border border-border text-foreground rounded-lg px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm font-medium text-muted-foreground ml-2 border-l border-border pl-4">
                                Total {totalCount} items
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="p-1.5 bg-muted hover:bg-accent disabled:opacity-50 text-muted-foreground hover:text-foreground rounded-lg transition"
                                title="First Page"
                            >
                                <ChevronsLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 bg-muted hover:bg-accent disabled:opacity-50 text-muted-foreground hover:text-foreground rounded-lg transition"
                                title="Previous Page"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="flex items-center gap-1 px-2">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = currentPage;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;

                                    if (pageNum < 1 || pageNum > totalPages) return null;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`min-w-[32px] h-8 px-2 rounded-full flex items-center justify-center text-sm font-bold transition border ${currentPage === pageNum ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'text-muted-foreground border-transparent hover:bg-muted hover:border-border'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                {totalPages > 5 && currentPage < totalPages - 2 && (
                                    <>
                                        <span className="text-muted-foreground px-1 font-bold">...</span>
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            className="min-w-[32px] h-8 px-2 rounded-full flex items-center justify-center text-sm font-bold text-muted-foreground border border-transparent hover:bg-muted hover:border-border transition"
                                        >
                                            {totalPages}
                                        </button>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 bg-muted hover:bg-accent disabled:opacity-50 text-muted-foreground hover:text-foreground rounded-lg transition"
                                title="Next Page"
                            >
                                <ChevronRight size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-1.5 bg-muted hover:bg-accent disabled:opacity-50 text-muted-foreground hover:text-foreground rounded-lg transition"
                                title="Last Page"
                            >
                                <ChevronsRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

            </div>

            <HelpSidebar
                isOpen={isHelpOpen}
                onClose={handleCloseHelp}
                activeTermId={activeHelpId}
            />
        </main>
    );
}
