'use client';
import React from 'react';
import { Card } from "@dmt/ui";
import { User, Activity, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface AssigneeInsight {
    assignee_name: string;
    load_assessment: string;
    insight: string;
    action_item: string;
}

interface DeepSprintAnalysisContentProps {
    overallHealth: string;
    assigneeInsights: AssigneeInsight[];
    riskFactors: string[];
}

export const DeepSprintAnalysisContent: React.FC<DeepSprintAnalysisContentProps> = ({
    overallHealth,
    assigneeInsights,
    riskFactors,
}) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Overall Health Card */}
            <Card className="p-6 bg-card border-primary/20 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Activity size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Execution Health Overview</h2>
                </div>
                <p className="text-foreground/80 leading-relaxed text-lg italic">
                    "{overallHealth}"
                </p>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Assignee Insights - Main Column */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                        <User size={18} className="text-primary" />
                        Assignee Performance & Load
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {assigneeInsights.map((insight, idx) => (
                            <Card key={idx} className="p-5 bg-card border-border hover:border-primary/30 transition-all group">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-bold text-foreground text-lg">{insight.assignee_name}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${insight.load_assessment.toLowerCase().includes('overload')
                                                    ? 'bg-destructive/20 text-destructive'
                                                    : insight.load_assessment.toLowerCase().includes('balanced')
                                                        ? 'bg-emerald-500/20 text-emerald-500'
                                                        : 'bg-warning/20 text-warning'
                                                }`}>
                                                {insight.load_assessment}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                            {insight.insight}
                                        </p>
                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                            <CheckCircle2 size={16} className="text-primary mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">Recommended Action</span>
                                                <p className="text-xs text-foreground/80 font-medium">{insight.action_item}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Risk Factors - Side Column */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                        <AlertTriangle size={18} className="text-destructive" />
                        Critical Risk Factors
                    </h3>
                    <div className="space-y-3">
                        {riskFactors.length > 0 ? (
                            riskFactors.map((risk, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                                    <p className="text-sm leading-relaxed">{risk}</p>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-500">
                                <CheckCircle2 size={18} />
                                <p className="text-sm">No systemic risks identified.</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 p-4 rounded-xl bg-muted/30 border border-border">
                        <div className="flex items-center gap-2 text-foreground/80 mb-2">
                            <Info size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Analysis Note</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            This analysis is based on story point distribution, cycle time trends, and AC quality metrics recorded during this sprint period.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
