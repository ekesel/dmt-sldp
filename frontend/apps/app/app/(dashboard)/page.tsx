"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from "@dmt/ui";
import { TrendingUp, FileText, BarChart3, AlertCircle, Share2, RefreshCcw, Sparkles, HelpCircle, CalendarDays, X, Loader2 } from "lucide-react";
import { KPICard } from "../../components/KPISection";
import { VelocityChart } from "../../components/charts/VelocityChart";
import { AIInsightsList } from "../../components/AIInsightsList";
import { AssigneeDistributionCard } from "../../components/AssigneeDistributionCard";
import { useDashboardData } from "../../hooks/useDashboardData";
import { ProjectSelector, Project } from "../../components/ProjectSelector";
import { SprintSelector, Sprint } from "../../components/SprintSelector";
import { ActiveFolderSelector } from "../../components/ActiveFolderSelector";
import { AIThinkingOverlay } from "../../components/AIThinkingOverlay";
import { SyncProgressOverlay } from '../../components/SyncProgressOverlay';
import { projects } from "@dmt/api";
import { toast } from "react-hot-toast";
import { HelpSidebar } from "../../components/HelpSidebar";
import { DatePicker } from "../../components/DatePicker";
function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function sprintRangeLabel(startDate: string, endDate: string, sprintName?: string | null): string {
    if (sprintName) return sprintName;
    if (!startDate && !endDate) return 'Last 5 sprints';
    if (startDate && endDate) return `${fmtDate(startDate)} – ${fmtDate(endDate)}`;
    if (startDate) return `From ${fmtDate(startDate)}`;
    return `Up to ${fmtDate(endDate)}`;
}

function getTodayDateStr(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
    const todayStr = getTodayDateStr();

    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
        if (typeof window !== 'undefined') {
            const savedProjectId = sessionStorage.getItem('dashboard_projectId');
            return savedProjectId ? Number(savedProjectId) : null;
        }
        return null;
    });
    const [startDate, setStartDate] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('dashboard_startDate') || '';
            const today = getTodayDateStr();
            if (saved && saved > today) {
                sessionStorage.removeItem('dashboard_startDate');
                return '';
            }
            return saved;
        }
        return '';
    });
    const [endDate, setEndDate] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('dashboard_endDate') || '';
            const today = getTodayDateStr();
            if (saved && saved > today) {
                sessionStorage.removeItem('dashboard_endDate');
                return '';
            }
            return saved;
        }
        return '';
    });
    const [selectedSprintId, setSelectedSprintId] = useState<number | null>(() => {
        if (typeof window !== 'undefined') {
            const savedSprintId = sessionStorage.getItem('dashboard_sprintId');
            return savedSprintId ? Number(savedSprintId) : null;
        }
        return null;
    });
    const [selectedSprintName, setSelectedSprintName] = useState<string>('');

    useEffect(() => {
        if (selectedProjectId !== null) {
            sessionStorage.setItem('dashboard_projectId', selectedProjectId.toString());
        } else {
            sessionStorage.removeItem('dashboard_projectId');
        }
    }, [selectedProjectId]);

    useEffect(() => {
        if (startDate) {
            sessionStorage.setItem('dashboard_startDate', startDate);
        } else {
            sessionStorage.removeItem('dashboard_startDate');
        }
    }, [startDate]);

    useEffect(() => {
        if (endDate) {
            sessionStorage.setItem('dashboard_endDate', endDate);
        } else {
            sessionStorage.removeItem('dashboard_endDate');
        }
    }, [endDate]);

    useEffect(() => {
        if (selectedSprintId !== null) {
            sessionStorage.setItem('dashboard_sprintId', selectedSprintId.toString());
        } else {
            sessionStorage.removeItem('dashboard_sprintId');
        }
    }, [selectedSprintId]);
    const [isExporting, setIsExporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [activeHelpId, setActiveHelpId] = useState<string | null>(null);
    const dashboardRef = useRef<HTMLDivElement>(null);
    const isDateInvalid = (d: string) => {
        if (!d) return false;
        const year = parseInt(d.split('-')[0], 10);
        if (year < 2000 || year > 2100) return true;
        return d > todayStr;
    };
    const isRangeInvalid = Boolean(startDate && endDate && new Date(startDate) > new Date(endDate));
    const hasInvalidDates = isDateInvalid(startDate) || isDateInvalid(endDate) || isRangeInvalid;

    const {
        summary, velocity, compliance, insights, assigneeDistribution,
        loading, error, refreshInsights, isRefreshingInsights,
        aiProgress, aiStatus
    } = useDashboardData(
        selectedProjectId,
        hasInvalidDates ? null : (startDate || null),
        hasInvalidDates ? null : (endDate || null),
        selectedSprintId
    );

    const handleProjectSelect = useCallback((projectId: number | null, project?: Project | null) => {
        setSelectedProjectId(projectId);
        setSelectedSprintId(null);
        setSelectedSprintName('');
        const projectName = project?.name || (projectId ? `Project ${projectId}` : 'All Projects');
        toast.success(`Project filter applied: ${projectName}`, { id: 'project-filter' });
    }, []);

    const handleSprintSelect = useCallback((sprintId: number | null, sprint?: Sprint | null) => {
        setSelectedSprintId(sprintId);
        setSelectedSprintName(sprint?.name || '');
        if (sprintId) {
            setStartDate('');
            setEndDate('');
            toast.success(`Sprint filter applied: ${sprint?.name || `Sprint ${sprintId}`}`, { id: 'sprint-filter' });
        } else {
            toast.success('All sprints selected', { id: 'sprint-filter' });
        }
    }, []);

    const handleClearSprint = () => {
        setSelectedSprintId(null);
        setSelectedSprintName('');
        toast.success('Sprint filter cleared', { id: 'sprint-filter' });
    };

    const handleStartDateChange = (val: string) => {
        if (val && val > todayStr) {
            toast.error('Cannot select future dates', { id: 'date-filter' });
            return;
        }
        setStartDate(val);
        if (val) {
            setSelectedSprintId(null);
            setSelectedSprintName('');
            if (isDateInvalid(val)) {
                return;
            }
            if (endDate && !isDateInvalid(endDate)) {
                if (new Date(val) > new Date(endDate)) {
                    toast.error('Start date cannot be after end date', { id: 'date-filter' });
                } else {
                    toast.success(`Date filter applied: ${fmtDate(val)} – ${fmtDate(endDate)}`, { id: 'date-filter' });
                }
            } else {
                toast.success(`Date filter applied: From ${fmtDate(val)}`, { id: 'date-filter' });
            }
        } else if (endDate && !isDateInvalid(endDate)) {
            toast.success(`Date filter applied: Up to ${fmtDate(endDate)}`, { id: 'date-filter' });
        } else {
            toast.success('Date filter cleared', { id: 'date-filter' });
        }
    };

    const handleEndDateChange = (val: string) => {
        if (val && val > todayStr) {
            toast.error('Cannot select future dates', { id: 'date-filter' });
            return;
        }
        setEndDate(val);
        if (val) {
            setSelectedSprintId(null);
            setSelectedSprintName('');
            if (isDateInvalid(val)) {
                return;
            }
            if (startDate && !isDateInvalid(startDate)) {
                if (new Date(startDate) > new Date(val)) {
                    toast.error('End date cannot be before start date', { id: 'date-filter' });
                } else {
                    toast.success(`Date filter applied: ${fmtDate(startDate)} – ${fmtDate(val)}`, { id: 'date-filter' });
                }
            } else {
                toast.success(`Date filter applied: Up to ${fmtDate(val)}`, { id: 'date-filter' });
            }
        } else if (startDate && !isDateInvalid(startDate)) {
            toast.success(`Date filter applied: From ${fmtDate(startDate)}`, { id: 'date-filter' });
        } else {
            toast.success('Date filter cleared', { id: 'date-filter' });
        }
    };

    const handleClearDateFilter = () => {
        setStartDate('');
        setEndDate('');
        toast.success('Date filter cleared', { id: 'date-filter' });
    };

    const handleHelpClick = (id: string) => {
        setActiveHelpId(id);
        setIsHelpOpen(true);
    };

    const handleExportPDF = async () => {
        if (!dashboardRef.current) return;

        try {
            setIsExporting(true);


            // Dynamically import client-side only libraries
            const html2canvas = (await import('html2canvas-pro')).default;
            const jspdfMod = await import('jspdf');
            const JsPDF = (jspdfMod as any).jsPDF || (jspdfMod as any).default;

            if (!JsPDF) throw new Error('Could not load jsPDF library');

            const pdf = new JsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: 'a4'
            });

            const margin = 40;
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const pWidth = pdfWidth - (margin * 2);
            const pHeight = pdfHeight - (margin * 2);

            const element = dashboardRef.current;

            // Create off-screen clone to prevent layout shift for the user
            const clone = element.cloneNode(true) as HTMLElement;

            // Copy canvas content if any exist
            const sourceCanvases = element.querySelectorAll('canvas');
            const clonedCanvases = clone.querySelectorAll('canvas');
            for (let i = 0; i < sourceCanvases.length; i++) {
                const destCtx = (clonedCanvases[i] as HTMLCanvasElement).getContext('2d');
                if (destCtx) {
                    destCtx.drawImage(sourceCanvases[i] as HTMLCanvasElement, 0, 0);
                }
            }

            // Replace date inputs with static text — cloneNode doesn't copy React-controlled .value,
            // and html2canvas can't render native date picker chrome.
            const originalDateInputs = element.querySelectorAll('input[type="date"]');
            const clonedDateInputs = clone.querySelectorAll('input[type="date"]');
            const fmtDatePdf = (d: string) =>
                d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
            clonedDateInputs.forEach((clonedInput, i) => {
                const val = (originalDateInputs[i] as HTMLInputElement)?.value || '';
                const span = document.createElement('span');
                span.className = clonedInput.className;
                span.textContent = fmtDatePdf(val);
                clonedInput.parentNode?.replaceChild(span, clonedInput);
            });
            // Wrap in parent container to preserve inherited styles
            const parent = element.parentElement;
            const cloneWrapper = document.createElement('div');
            if (parent) {
                cloneWrapper.className = parent.className;
            }
            // Override height and overflow constraints that would collapse or truncate the clone
            cloneWrapper.style.position = 'absolute';
            cloneWrapper.style.left = '-9999px';
            cloneWrapper.style.top = '0';
            cloneWrapper.style.width = '1400px';
            cloneWrapper.style.minWidth = '1400px';
            cloneWrapper.style.height = 'auto';
            cloneWrapper.style.minHeight = 'none';
            cloneWrapper.style.maxHeight = 'none';
            cloneWrapper.style.overflow = 'visible';

            // Apply desktop constraints to clone and override any collapsing styles
            clone.style.width = '1400px';
            clone.style.minWidth = '1400px';
            clone.style.maxWidth = 'none';
            clone.style.margin = '0';
            clone.style.padding = '0';
            clone.style.height = 'auto';
            clone.style.minHeight = 'none';
            clone.style.maxHeight = 'none';
            clone.style.overflow = 'visible';

            cloneWrapper.appendChild(clone);
            document.body.appendChild(cloneWrapper);

            // Wait for reflow/render
            await new Promise(resolve => setTimeout(resolve, 300));

            const mainCanvas = await html2canvas(clone, {
                scale: 2, // High resolution
                useCORS: true,
                backgroundColor: '#f9fafa',
                logging: false,
                width: 1400,
            });

            // Calculate page breaks using clone's laid out elements while it is still in the DOM
            const cssPageHeight = (pHeight * 1400) / pWidth;
            const scale = mainCanvas.width / 1400;
            const cloneHeight = clone.offsetHeight || (mainCanvas.height / scale);
            const pageBreaks: number[] = [];
            let currentCssY = 0;

            const avoidElements = Array.from(clone.querySelectorAll('tr, .rounded-3xl, .rounded-2xl, .p-8, h2, h3, [data-page-break-avoid]'));
            const cloneRect = clone.getBoundingClientRect();

            const elementRanges = avoidElements
                .map(el => {
                    const rect = el.getBoundingClientRect();
                    return {
                        top: rect.top - cloneRect.top,
                        bottom: rect.bottom - cloneRect.top
                    };
                })
                .filter(range => range.bottom > range.top);

            while (currentCssY < cloneHeight) {
                let nextBreakY = currentCssY + cssPageHeight;
                if (nextBreakY >= cloneHeight) {
                    pageBreaks.push(cloneHeight);
                    break;
                }

                // Check if nextBreakY falls inside any element that we want to avoid breaking
                const overlappingElement = elementRanges.find(r => r.top < nextBreakY && r.bottom > nextBreakY);
                if (overlappingElement) {
                    const elementHeight = overlappingElement.bottom - overlappingElement.top;
                    if (elementHeight <= cssPageHeight && overlappingElement.top > currentCssY) {
                        nextBreakY = overlappingElement.top;
                    }
                }

                pageBreaks.push(nextBreakY);
                currentCssY = nextBreakY;
            }

            // Clean up clone from DOM now that measurements are complete
            document.body.removeChild(cloneWrapper);

            if (pageBreaks.length === 0) {
                let tempY = 0;
                while (tempY < cloneHeight) {
                    tempY += cssPageHeight;
                    pageBreaks.push(Math.min(tempY, cloneHeight));
                }
            }

            const canvasPageBreaks = pageBreaks.map(y => Math.round(y * scale));

            let lastCanvasY = 0;
            let pageNum = 1;

            for (const breakY of canvasPageBreaks) {
                const sliceHeight = breakY - lastCanvasY;
                if (sliceHeight <= 0) continue;

                if (pageNum > 1) pdf.addPage();

                // Set page background
                pdf.setFillColor('#f9fafa');
                pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

                // Create a temporary canvas for this page to ensure no background bleed or overlap
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = mainCanvas.width;
                pageCanvas.height = sliceHeight;
                const pageCtx = pageCanvas.getContext('2d');

                if (pageCtx) {
                    pageCtx.drawImage(
                        mainCanvas,
                        0, lastCanvasY, mainCanvas.width, sliceHeight, // Source
                        0, 0, mainCanvas.width, sliceHeight         // Destination
                    );

                    const pageImgData = pageCanvas.toDataURL('image/png');
                    // Calculate the display height for this slice on the PDF
                    const displayHeight = (sliceHeight * pWidth) / mainCanvas.width;

                    pdf.addImage(pageImgData, 'PNG', margin, margin, pWidth, displayHeight);
                }

                lastCanvasY = breakY;
                pageNum++;
            }

            const pdfName = `dashboard-${selectedProjectId || 'global'}${selectedSprintId ? `-sprint-${selectedSprintId}` : ''}-${new Date().toISOString().split('T')[0]}.pdf`;
            const pdfBlob = pdf.output('blob');
            const blobUrl = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));

            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', pdfName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);


        } catch (err) {
            console.error('[PDF Export] Error:', err);
            alert('Failed to export PDF.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleResync = async () => {
        if (!selectedProjectId) return;

        try {
            setIsSyncing(true);
            setIsSyncModalOpen(true);
            const response = await projects.triggerSync(selectedProjectId);

        } catch (err) {
            console.error('[Sync] Error:', err);
            toast.error('Failed to trigger synchronization');
            setIsSyncModalOpen(false);
        } finally {
            setIsSyncing(false);
        }
    };

    if (error && !summary) {
        return (
            <main className="min-h-screen bg-background p-8">
                <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Failed to Load Dashboard</h3>
                    <p className="text-muted-foreground mt-2 max-w-md">{error}</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background p-8 selection:bg-primary/30">
            <div ref={dashboardRef} id="dashboard-container" className="max-w-7xl mx-auto space-y-8 mt-8">
                <header className="flex justify-between items-end border-b border-border pb-8">
                    <div>
                        <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider uppercase mb-2">
                            <TrendingUp size={16} />
                            Performance Overview
                        </div>
                        <h1 className="text-4xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
                            {selectedProjectId ? 'Project Analytics' : 'Organizational Analytics'}
                        </h1>
                        <p className="text-muted-foreground mt-2 font-medium">Monitoring engineering excellence and DMT compliance.</p>
                    </div>
                    <div className="flex gap-4 items-center flex-wrap justify-end">
                        <ProjectSelector
                            selectedProjectId={selectedProjectId}
                            onSelect={handleProjectSelect}
                        />
                        {selectedProjectId !== null && (
                            <div className="flex items-center gap-2">
                                <SprintSelector
                                    projectId={selectedProjectId}
                                    selectedSprintId={selectedSprintId}
                                    onSelect={handleSprintSelect}
                                    autoSelectLatest={false}
                                    allowAll={true}
                                    className="w-56 h-12"
                                />
                                {selectedSprintId !== null && (
                                    <button
                                        onClick={handleClearSprint}
                                        className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border shrink-0 cursor-pointer"
                                        title="Clear sprint filter"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <DatePicker
                                label="From"
                                value={startDate}
                                min="2000-01-01"
                                max={endDate && endDate <= todayStr ? endDate : todayStr}
                                onChange={handleStartDateChange}
                            />
                            <span className="text-muted-foreground text-sm font-bold">→</span>
                            <DatePicker
                                label="To"
                                value={endDate}
                                min={startDate || "2000-01-01"}
                                max={todayStr}
                                onChange={handleEndDateChange}
                                popoverAlign="right"
                            />
                            {(startDate || endDate) && (
                                <button
                                    onClick={handleClearDateFilter}
                                    className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border shrink-0 cursor-pointer"
                                    title="Clear date filter"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        <ActiveFolderSelector
                            projectId={selectedProjectId}
                            onFolderChanged={() => {
                                // Simply reload the page to clear frontend caches and fetch new metric scoped data
                                window.location.reload();
                            }}
                        />
                        {selectedProjectId && (
                            <button
                                onClick={handleResync}
                                disabled={isSyncing}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all font-bold border border-border cursor-pointer ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Resync Project Data"
                            >
                                <RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} />
                                {isSyncing ? 'Syncing...' : 'Resync'}
                            </button>
                        )}
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20 cursor-pointer ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <FileText size={18} />
                            {isExporting ? 'Exporting...' : 'Export PDF'}
                        </button>
                    </div>
                </header>


                <div className="relative min-h-[400px]">
                    {loading && summary && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                <span className="text-sm font-medium text-muted-foreground">Loading analytics...</span>
                            </div>
                        </div>
                    )}

                    {(() => {
                        if (loading && !summary) {
                            return (
                                <div className="space-y-8 animate-pulse">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="h-36 rounded-2xl bg-card border-2 border-primary/20 p-6 flex flex-col justify-between">
                                                <div className="h-4 w-24 bg-muted rounded"></div>
                                                <div className="h-8 w-32 bg-muted rounded"></div>
                                                <div className="h-3 w-28 bg-muted rounded"></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="min-h-[450px] rounded-2xl bg-card border border-border p-8 flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <div className="h-6 w-40 bg-muted rounded"></div>
                                            <div className="h-4 w-60 bg-muted rounded"></div>
                                        </div>
                                        <div className="h-[380px] w-full bg-muted/20 rounded-xl"></div>
                                    </div>
                                </div>
                            );
                        }

                        if (hasInvalidDates) {
                            return (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                        <CalendarDays className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">No Data Available</h3>
                                    <p className="text-muted-foreground mt-2 max-w-md">
                                        The selected date range is invalid or out of realistic bounds (e.g. before year 2000). Please select a valid date range to view analytics.
                                    </p>
                                </div>
                            );
                        }

                        return (
                            <div className={`space-y-8 transition-opacity duration-200 ${loading && summary ? 'opacity-40 pointer-events-none' : ''}`}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                                    <KPICard
                                        label="Sprint Velocity"
                                        value={`${summary?.velocity || 0} SP`}
                                        trend={selectedProjectId ? undefined : { direction: 'neutral', value: 'Avg' }}
                                        description={<span className="text-primary">{selectedSprintName || (selectedProjectId ? sprintRangeLabel(startDate, endDate) : `Average of ${sprintRangeLabel(startDate, endDate).toLowerCase()}`)}</span>}
                                        valueClassName="text-accent !text-2xl"
                                        className="border-2 border-primary hover:ring-2 hover:ring-inset hover:ring-primary bg-none backdrop-blur-none text-center [&>div.flex]:justify-center"
                                        labelClassName="font-bold text-base whitespace-nowrap text-primary"
                                        helpId="velocity"
                                        onHelpClick={handleHelpClick}
                                    />
                                    <KPICard
                                        label="Cycle Time"
                                        value={`${summary?.cycle_time || 0} Days`}
                                        trend={selectedProjectId ? undefined : { direction: 'neutral', value: 'Avg' }}
                                        description={<span className="text-primary">{selectedProjectId ? 'Resolution duration' : 'Average resolution duration'}</span>}
                                        valueClassName="text-accent !text-2xl"
                                        className="border-2 border-primary hover:ring-2 hover:ring-inset hover:ring-primary bg-none backdrop-blur-none text-center [&>div.flex]:justify-center"
                                        labelClassName="font-bold text-base whitespace-nowrap text-primary"
                                        helpId="cycle_time"
                                        onHelpClick={handleHelpClick}
                                    />
                                    <KPICard
                                        label="DMT Compliance"
                                        value={`${(summary?.compliance_rate || 0).toFixed(1)}%`}
                                        trend={selectedProjectId ? undefined : { direction: summary?.compliance_rate && summary.compliance_rate >= 80 ? 'up' : 'down', value: 'Avg' }}
                                        description={<span className="text-primary">Minimum Threshold: 80%</span>}
                                        valueClassName="text-accent !text-2xl"
                                        className="border-2 border-primary hover:ring-2 hover:ring-inset hover:ring-primary bg-none backdrop-blur-none text-center [&>div.flex]:justify-center"
                                        labelClassName="font-bold text-base whitespace-nowrap text-primary"
                                        helpId="compliance"
                                        onHelpClick={handleHelpClick}
                                    />
                                    <KPICard
                                        label="Objective AI"
                                        value={`${(summary?.code_ai_usage_percent || 0).toFixed(1)}%`}
                                        trend={{ direction: 'neutral', value: 'Analyzed' }}
                                        description={<span className="text-primary">PR-based AI evaluation</span>}
                                        icon={<Sparkles size={16} className="text-brand-primary" />}
                                        valueClassName="text-accent !text-2xl"
                                        className="border-2 border-primary hover:ring-2 hover:ring-inset hover:ring-primary bg-none backdrop-blur-none text-center [&>div.flex]:justify-center"
                                        labelClassName="font-bold text-base whitespace-nowrap text-primary"
                                        helpId="objective_ai"
                                        onHelpClick={handleHelpClick}
                                    />
                                    <KPICard
                                        label="Bugs Resolved"
                                        value={(summary?.bugs_resolved || 0).toString()}
                                        trend={{ direction: 'neutral', value: 'Total' }}
                                        description={<span className="text-primary">Bugs fixed in {sprintRangeLabel(startDate, endDate, selectedSprintName).toLowerCase()}</span>}
                                        valueClassName="text-accent !text-2xl"
                                        className="border-2 border-primary hover:ring-2 hover:ring-inset hover:ring-primary bg-none backdrop-blur-none text-center [&>div.flex]:justify-center"
                                        labelClassName="font-bold text-base whitespace-nowrap text-primary"
                                        helpId="bugs_resolved"
                                        onHelpClick={handleHelpClick}
                                    />
                                </div>

                                <Card className="min-h-[450px] flex flex-col p-8 bg-card border-border backdrop-blur-xl shadow-none">
                                    <div className="flex items-center justify-between mb-10">
                                        <div>
                                            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                                <BarChart3 className="text-primary" />
                                                Velocity History
                                            </h2>
                                            <p className="text-muted-foreground text-sm mt-1">Sprint-over-sprint delivery trends</p>
                                        </div>
                                    </div>
                                    <div className="w-full h-[380px] min-h-[380px] bg-muted/10 rounded-2xl border border-border p-4">
                                        <VelocityChart data={velocity} />
                                    </div>
                                </Card>

                                {/* Critical Alerts - Simplified logic based on compliance */}
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                        <AlertCircle className="text-destructive" />
                                        Compliance Alerts
                                    </h2>
                                    {summary?.compliance_rate !== undefined && summary.compliance_rate < 80 && (
                                        <Card className="bg-destructive/5 border-destructive/20 p-6 group hover:bg-destructive/10 transition-colors cursor-default shadow-none">
                                            <div className="flex justify-between items-start">
                                                <span className="px-2 py-1 rounded text-[10px] font-black uppercase bg-destructive text-destructive-foreground leading-none">High Risk</span>
                                            </div>
                                            <p className="text-destructive font-bold mt-4 group-hover:text-foreground transition-colors">Low Compliance Rate</p>
                                            <p className="text-destructive/80 text-sm mt-2 leading-relaxed group-hover:text-foreground/80 transition-colors">Overall compliance is {summary.compliance_rate}%, below the 80% threshold.</p>
                                        </Card>
                                    )}
                                    {(!summary || (summary.compliance_rate >= 80)) && (
                                        <p className="text-muted-foreground">No critical alerts at this time.</p>
                                    )}
                                </div>

                                {/* Assignee Distribution Card */}
                                {assigneeDistribution.length > 0 && (
                                    <AssigneeDistributionCard assignees={assigneeDistribution} sprintRangeLabel={sprintRangeLabel(startDate, endDate, selectedSprintName)} />
                                )}

                                <div className="pt-8 border-t border-border">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Share2 className="text-primary w-5 h-5" />
                                            <h2 className="text-2xl font-bold text-foreground">
                                                {insights.length > 0 && insights[0].project_name ? `Insights for ${insights[0].project_name}` : "Project Insights"}
                                            </h2>
                                        </div>
                                        <button
                                            onClick={refreshInsights}
                                            disabled={isRefreshingInsights}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all text-xs font-bold border border-border ${isRefreshingInsights ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <RefreshCcw size={14} className={isRefreshingInsights ? 'animate-spin' : ''} />
                                            {isRefreshingInsights ? 'Refreshing...' : 'Refresh Insights'}
                                        </button>
                                    </div>

                                    {isRefreshingInsights ? (
                                        <AIThinkingOverlay progress={aiProgress} status={aiStatus} />
                                    ) : insights.length > 0 ? (
                                        <>
                                            <AIInsightsList
                                                insightId={insights[0].id}
                                                suggestions={insights[0].suggestions}
                                                onAllHandled={refreshInsights}
                                            />
                                            <div className="mt-4 p-4 bg-muted/20 rounded-xl border border-border">
                                                <h4 className="text-sm font-bold text-foreground/80 mb-2">AI Summary</h4>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{insights[0].summary}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <Card className="p-8 bg-card border-dashed border-border flex flex-col items-center justify-center text-center shadow-none">
                                            <TrendingUp className="text-muted-foreground/60 mb-4" size={32} />
                                            <p className="text-muted-foreground font-medium whitespace-pre-wrap">No AI insights available for this project yet.{"\n"}Click "Refresh Insights" to generate performance-based recommendations.</p>
                                        </Card>
                                    )}
                                </div>

                                <div className="pt-8 border-t border-border" />
                            </div>
                        );
                    })()}
                </div>
            </div>

            {selectedProjectId && (
                <SyncProgressOverlay
                    isOpen={isSyncModalOpen}
                    onClose={() => setIsSyncModalOpen(false)}
                    projectId={selectedProjectId}
                    tenantId={localStorage.getItem('dmt-tenant') || undefined}
                />
            )}

            <HelpSidebar
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
                activeTermId={activeHelpId}
            />
        </main>
    );
}
