"use client";
import React, { useState } from 'react';
import { Card } from "@dmt/ui";
import { Check, X, Sparkles, AlertCircle } from "lucide-react";
import { dashboard } from "@dmt/api";

interface Suggestion {
    id: string;
    title: string;
    impact: 'High' | 'Medium' | 'Low';
    description: string;
    status: 'pending' | 'accepted' | 'rejected';
}

interface AIInsightsListProps {
    insightId: number;
    suggestions: Suggestion[];
}

export const AIInsightsList: React.FC<AIInsightsListProps> = ({ insightId, suggestions: initialSuggestions }) => {
    const [suggestions, setSuggestions] = useState(initialSuggestions);

    const handleFeedback = async (suggestionId: string, status: 'accepted' | 'rejected') => {
        try {
            await dashboard.updateInsightFeedback(insightId, suggestionId, status);
            setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        } catch (err) {
            console.error("Failed to update AI feedback:", err);
        }
    };

    if (suggestions.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-brand-primary" />
                AI Optimization Suggestions
            </h3>
            <div className="grid grid-cols-1 gap-4">
                {suggestions.map((s) => (
                    <Card key={s.id} className="bg-slate-900/60 border-white/5 p-4 hover:border-brand-primary/20 transition-all">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${s.impact === 'High' ? 'bg-rose-500 text-white' :
                                            s.impact === 'Medium' ? 'bg-amber-500 text-black' :
                                                'bg-slate-700 text-slate-300'
                                        }`}>
                                        {s.impact} Impact
                                    </span>
                                    <p className="text-sm font-bold text-white">{s.title}</p>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleFeedback(s.id, 'rejected')}
                                    className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                                    title="Discard"
                                >
                                    <X size={16} />
                                </button>
                                <button
                                    onClick={() => handleFeedback(s.id, 'accepted')}
                                    className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-lg shadow-brand-primary/10"
                                    title="Accept Strategy"
                                >
                                    <Check size={16} />
                                </button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};
