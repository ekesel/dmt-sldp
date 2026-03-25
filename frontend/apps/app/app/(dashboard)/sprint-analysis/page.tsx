'use client';
import React, { useState } from 'react';
import { Card } from "@dmt/ui";
import { Sparkles, BarChart3, RefreshCcw, LayoutDashboard, AlertCircle } from "lucide-react";
import { ProjectSelector } from "../../../components/ProjectSelector";
import { SprintSelector } from "../../../components/SprintSelector";
import { AIThinkingOverlay } from "../../../components/AIThinkingOverlay";
import { DeepSprintAnalysisContent } from "../../../components/DeepSprintAnalysisContent";
import { useDeepSprintAnalysis } from "../../../hooks/useDeepSprintAnalysis";
import Link from 'next/link';

export default function SprintAnalysisPage() {
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

    const {
        insight,
        loading,
        error,
        runAnalysis,
        isRefreshing,
        progress,
        status
    } = useDeepSprintAnalysis(selectedProjectId, selectedSprintId);

    // Parsing risk factors if they come as a JSON string in forecast
    let riskFactors: string[] = [];
    try {
        if (insight?.forecast) {
            riskFactors = JSON.parse(insight.forecast);
        }
    } catch (e) {
        riskFactors = insight?.forecast ? [insight.forecast] : [];
    }

    return (
        <main className="min-h-screen bg-background p-8 selection:bg-primary/30">
            <div className="max-w-7xl mx-auto space-y-8 mt-8">
                <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-border pb-8 gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider uppercase mb-2">
                            <Sparkles size={16} />
                            AI Deep Lens
                        </div>
                        <h1 className="text-4xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
                            Deep Sprint Analysis
                        </h1>
                        <p className="text-muted-foreground mt-2 font-medium">Assignee-centric performance and bottleneck identification.</p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center justify-start md:justify-end">
                        <ProjectSelector
                            selectedProjectId={selectedProjectId}
                            onSelect={setSelectedProjectId}
                        />
                        <SprintSelector
                            projectId={selectedProjectId}
                            selectedSprintId={selectedSprintId}
                            onSelect={setSelectedSprintId}
                        />
                        <button
                            onClick={runAnalysis}
                            disabled={isRefreshing || !selectedSprintId}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20 ${isRefreshing || !selectedSprintId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                        >
                            <RefreshCcw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                            {isRefreshing ? 'Analyzing...' : 'Run New Analysis'}
                        </button>
                    </div>
                </header>

                {!selectedSprintId ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6 text-muted-foreground">
                            <BarChart3 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">No Sprint Selected</h2>
                        <p className="text-muted-foreground mt-2 max-w-sm">Please select a project and a sprint from the header to begin the deep analysis.</p>
                    </div>
                ) : loading && !insight ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                        <p className="text-muted-foreground font-medium">Loading analysis report...</p>
                    </div>
                ) : insight ? (
                    <div className="space-y-8">
                        {isRefreshing && (
                            <AIThinkingOverlay progress={progress} status={status} />
                        )}

                        <DeepSprintAnalysisContent
                            overallHealth={insight.summary}
                            assigneeInsights={insight.suggestions || []}
                            riskFactors={riskFactors}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border/50 rounded-3xl bg-muted/20">
                        <Sparkles size={48} className="text-muted-foreground mb-6" />
                        <h2 className="text-xl font-bold text-foreground">No analysis found for this sprint</h2>
                        <p className="text-muted-foreground mt-2 max-w-sm mb-8">Ready to dive deep into performance metrics? Run your first AI analysis now.</p>
                        <button
                            onClick={runAnalysis}
                            disabled={isRefreshing}
                            className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:scale-105 transition-transform shadow-xl shadow-primary/20"
                        >
                            {isRefreshing ? 'Processing...' : 'Generate Analysis'}
                        </button>
                    </div>
                )}

                {error && (
                    <Card className="p-4 bg-destructive/10 border-destructive/20 flex items-center gap-3 text-destructive">
                        <AlertCircle size={20} />
                        <p className="text-sm font-medium">{error}</p>
                    </Card>
                )}

                <footer className="pt-12 border-t border-border flex justify-between items-center text-muted-foreground text-sm">
                    <Link href="/" className="flex items-center gap-2 hover:text-foreground transition-colors font-medium">
                        <LayoutDashboard size={16} />
                        Back to Dashboard
                    </Link>
                    <p>© 2026 Elevate AI Engine</p>
                </footer>
            </div>
        </main>
    );
}
