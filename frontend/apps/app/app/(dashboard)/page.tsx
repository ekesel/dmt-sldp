"use client";
import React, { useState, useRef } from 'react';
import { Card } from "@dmt/ui";
import { TrendingUp, FileText, BarChart3, AlertCircle, Share2, RefreshCcw } from "lucide-react";
import { KPICard } from "../../components/KPISection";
import { VelocityChart } from "../../components/charts/VelocityChart";
import { ForecastChart } from "../../components/charts/ForecastChart";
import { AIInsightsList } from "../../components/AIInsightsList";
import { AssigneeDistributionCard } from "../../components/AssigneeDistributionCard";
import { useDashboardData } from "../../hooks/useDashboardData";
import { ProjectSelector } from "../../components/ProjectSelector";
import { ActiveFolderSelector } from "../../components/ActiveFolderSelector";
import { AIThinkingOverlay } from "../../components/AIThinkingOverlay";
import { SyncProgressOverlay } from '../../components/SyncProgressOverlay';
import { projects } from "@dmt/api";
import { toast } from "react-hot-toast";

export default function DashboardPage() {
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);
    const {
        summary, velocity, compliance, insights, forecast, assigneeDistribution,
        loading, error, refreshInsights, isRefreshingInsights,
        aiProgress, aiStatus
    } = useDashboardData(selectedProjectId);

    const handleExportPDF = async () => {
        if (!dashboardRef.current) return;

        try {
            setIsExporting(true);
            console.log('[PDF Export] Starting professional sliced export...');

            // Dynamically import client-side only libraries
            const html2canvas = (await import('html2canvas')).default;
            const jspdfMod = await import('jspdf');
            const JsPDF = (jspdfMod as any).jsPDF || (jspdfMod as any).default;

            if (!JsPDF) throw new Error('Could not load jsPDF library');

            const element = dashboardRef.current;
            const originalStyle = element.style.cssText;

            // Force desktop layout (1400px) and disable constraints
            element.style.width = '1400px';
            element.style.minWidth = '1400px';
            element.style.maxWidth = 'none';
            element.style.margin = '0';
            element.style.padding = '0';
            element.style.height = 'auto';
            element.style.overflow = 'visible';

            // Wait for reflow
            await new Promise(resolve => setTimeout(resolve, 300));

            const mainCanvas = await html2canvas(element, {
                scale: 2, // High resolution
                useCORS: true,
                backgroundColor: '#0f172a',
                logging: false,
                width: 1400,
            });

            // Restore original styles
            element.style.cssText = originalStyle;

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

            // Calculate how much of the canvas height fits into one printable page height
            const canvasPageHeight = (pHeight * mainCanvas.width) / pWidth;
            let currentY = 0;
            let pageNum = 1;

            console.log(`[PDF Export] Slicing into pages. Total canvas height: ${mainCanvas.height}, Page height: ${canvasPageHeight}`);

            while (currentY < mainCanvas.height) {
                if (pageNum > 1) pdf.addPage();

                // Set page background
                pdf.setFillColor('#0f172a');
                pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

                // Determine the height of this slice
                const remainingHeight = mainCanvas.height - currentY;
                const sliceHeight = Math.min(canvasPageHeight, remainingHeight);

                // Create a temporary canvas for this page to ensure no background bleed or overlap
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = mainCanvas.width;
                pageCanvas.height = sliceHeight;
                const pageCtx = pageCanvas.getContext('2d');

                if (pageCtx) {
                    pageCtx.drawImage(
                        mainCanvas,
                        0, currentY, mainCanvas.width, sliceHeight, // Source
                        0, 0, mainCanvas.width, sliceHeight         // Destination
                    );

                    const pageImgData = pageCanvas.toDataURL('image/png');
                    // Calculate the display height for this slice on the PDF
                    const displayHeight = (sliceHeight * pWidth) / mainCanvas.width;

                    pdf.addImage(pageImgData, 'PNG', margin, margin, pWidth, displayHeight);
                }

                currentY += canvasPageHeight;
                pageNum++;
            }

            const pdfName = `dashboard-${selectedProjectId || 'global'}-${new Date().toISOString().split('T')[0]}.pdf`;
            const pdfBlob = pdf.output('blob');
            const blobUrl = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));

            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', pdfName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

            console.log('[PDF Export] Sliced export triggered successfully');
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
            console.log('[Sync] Triggered:', response);
        } catch (err) {
            console.error('[Sync] Error:', err);
            toast.error('Failed to trigger synchronization');
            setIsSyncModalOpen(false);
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading && !summary) {
        return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-white">Loading...</div>;
    }

    if (error && !summary) {
        return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-rose-500">{error}</div>;
    }

    return (
        <main className="min-h-screen bg-brand-dark p-8 selection:bg-brand-primary/30">
            <div ref={dashboardRef} id="dashboard-container" className="max-w-7xl mx-auto space-y-8 mt-8">
                <header className="flex justify-between items-end border-b border-white/5 pb-8">
                    <div>
                        <div className="flex items-center gap-2 text-brand-primary text-sm font-bold tracking-wider uppercase mb-2">
                            <TrendingUp size={16} />
                            Performance Overview
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                            {selectedProjectId ? 'Project Analytics' : 'Organizational Analytics'}
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">Monitoring engineering excellence and DMT compliance.</p>
                    </div>
                    <div className="flex gap-4 items-center flex-wrap justify-end">
                        <ProjectSelector
                            selectedProjectId={selectedProjectId}
                            onSelect={setSelectedProjectId}
                        />
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
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-all font-bold border border-white/10 cursor-pointer ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Resync Project Data"
                            >
                                <RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} />
                                {isSyncing ? 'Syncing...' : 'Resync'}
                            </button>
                        )}
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 transition-all font-bold shadow-lg shadow-brand-primary/20 cursor-pointer ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <FileText size={18} />
                            {isExporting ? 'Exporting...' : 'Export PDF'}
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <KPICard
                        label="Sprint Velocity"
                        value={`${summary?.velocity || 0} SP`}
                        trend={{ direction: 'neutral', value: 'Avg' }}
                        description="Average of last 5 sprints"
                    />
                    <KPICard
                        label="Cycle Time"
                        value={`${summary?.cycle_time || 0} Days`}
                        trend={{ direction: 'neutral', value: 'Avg' }}
                        description="Average resolution duration"
                    />
                    <KPICard
                        label="DMT Compliance"
                        value={`${(summary?.compliance_rate || 0).toFixed(1)}%`}
                        trend={{ direction: summary?.compliance_rate && summary.compliance_rate >= 80 ? 'up' : 'down', value: 'Avg' }}
                        description="Minimum Threshold: 80%"
                    />
                    <KPICard
                        label="Bugs Resolved"
                        value={(summary?.bugs_resolved || 0).toString()}
                        trend={{ direction: 'neutral', value: 'Total' }}
                        description="Bugs fixed in the last 5 sprints"
                    />
                </div>

                {/* Assignee Distribution Card */}
                {assigneeDistribution.length > 0 && (
                    <AssigneeDistributionCard assignees={assigneeDistribution} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 min-h-[450px] flex flex-col p-8 bg-slate-900/40 border-white/5 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <BarChart3 className="text-brand-primary" />
                                    Velocity History
                                </h2>
                                <p className="text-slate-500 text-sm mt-1">Sprint-over-sprint delivery trends</p>
                            </div>
                        </div>
                        <div className="flex-1 w-full bg-slate-800/10 rounded-2xl border border-white/5 p-4">
                            <VelocityChart data={velocity} />
                        </div>
                    </Card>

                    <Card className="min-h-[450px] flex flex-col p-8 bg-slate-900/40 border-white/5 backdrop-blur-xl">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <TrendingUp className="text-brand-primary" />
                                Delivery Forecast
                            </h2>
                            <p className="text-slate-500 text-sm mt-1">Stochastic prediction based on historical cycle times</p>
                        </div>
                        <div className="flex-1 w-full flex items-center justify-center text-slate-500">
                            {forecast ? (
                                <ForecastChart data={forecast} />
                            ) : (
                                "Forecast data unavailable (insufficient historical records)"
                            )}
                        </div>
                    </Card>

                    {/* Critical Alerts - Simplified logic based on compliance */}
                    <div className="lg:col-span-3 space-y-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <AlertCircle className="text-rose-500" />
                            Compliance Alerts
                        </h2>
                        {summary?.compliance_rate !== undefined && summary.compliance_rate < 80 && (
                            <Card className="bg-rose-500/5 border-rose-500/20 p-6 group hover:bg-rose-500/10 transition-colors cursor-default">
                                <div className="flex justify-between items-start">
                                    <span className="px-2 py-1 rounded text-[10px] font-black uppercase bg-rose-500 text-white leading-none">High Risk</span>
                                </div>
                                <p className="text-rose-100 font-bold mt-4 group-hover:text-white transition-colors">Low Compliance Rate</p>
                                <p className="text-rose-200/40 text-sm mt-2 leading-relaxed">Overall compliance is {summary.compliance_rate}%, below the 80% threshold.</p>
                            </Card>
                        )}
                        {(!summary || (summary.compliance_rate >= 80)) && (
                            <p className="text-slate-400">No critical alerts at this time.</p>
                        )}
                    </div>
                </div>

                {insights && insights.length > 0 && (
                    <div className="pt-8 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-4">
                            <Share2 className="text-brand-primary w-5 h-5" />
                            <h2 className="text-2xl font-bold text-white">
                                {insights[0].project_name ? `Insights for ${insights[0].project_name}` : "Global Insights"}
                            </h2>
                        </div>
                        <button
                            onClick={refreshInsights}
                            disabled={isRefreshingInsights}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-all text-xs font-bold border border-white/10 mb-4 ${isRefreshingInsights ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <RefreshCcw size={14} className={isRefreshingInsights ? 'animate-spin' : ''} />
                            {isRefreshingInsights ? 'Refreshing...' : 'Refresh Insights'}
                        </button>

                        {isRefreshingInsights ? (
                            <AIThinkingOverlay progress={aiProgress} status={aiStatus} />
                        ) : (
                            <>
                                <AIInsightsList
                                    insightId={insights[0].id}
                                    suggestions={insights[0].suggestions}
                                    onAllHandled={refreshInsights}
                                />
                                <div className="mt-4 p-4 bg-slate-800/20 rounded-xl border border-white/5">
                                    <h4 className="text-sm font-bold text-slate-300 mb-2">AI Summary</h4>
                                    <p className="text-sm text-slate-400 leading-relaxed">{insights[0].summary}</p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {selectedProjectId && (
                <SyncProgressOverlay
                    isOpen={isSyncModalOpen}
                    onClose={() => setIsSyncModalOpen(false)}
                    projectId={selectedProjectId}
                    tenantId={localStorage.getItem('dmt-tenant') || undefined}
                />
            )}
        </main>
    );
}
