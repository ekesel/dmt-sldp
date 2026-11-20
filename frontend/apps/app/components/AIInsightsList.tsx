"use client";
import React, { useState, useEffect } from 'react';
import { Card } from "@dmt/ui";
import { Check, X, Sparkles, AlertCircle } from "lucide-react";
import { dashboard, aiInsights } from "@dmt/api";
import { toast } from 'react-hot-toast';

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
    onAllHandled?: () => void;
}

export const AIInsightsList: React.FC<AIInsightsListProps> = ({ insightId, suggestions: initialSuggestions, onAllHandled }) => {
    const [suggestions, setSuggestions] = useState(initialSuggestions.filter(s => s.status === 'pending'));

    useEffect(() => {
        setSuggestions(initialSuggestions.filter(s => s.status === 'pending'));
    }, [initialSuggestions]);

    const handleFeedback = async (suggestionId: string, status: 'accepted' | 'rejected') => {
        try {
            await aiInsights.updateFeedback(insightId, suggestionId, status);
            const remaining = suggestions.filter(s => s.id !== suggestionId);
            setSuggestions(remaining);

            if (remaining.length === 0 && onAllHandled) {
                onAllHandled();
            }
        } catch (err) {
            console.error("Failed to update AI feedback:", err);
            toast.error("Failed to update feedback");
        }
    };

    if (suggestions.length === 0) return null;

    return (
        <div className="space-y-3 sm:space-y-4 w-full min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles size={18} className="text-primary shrink-0" />
                AI Optimization Suggestions
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {suggestions.map((s) => (
                    <Card key={s.id} className="bg-card/60 border-border p-3.5 sm:p-4 hover:border-primary/20 transition-all w-full min-w-0">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className={`text-[0.625rem] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${s.impact === 'High' ? 'bg-destructive text-destructive-foreground' :
                                        s.impact === 'Medium' ? 'bg-warning text-warning-foreground' :
                                            'bg-muted text-muted-foreground'
                                        }`}>
                                        {s.impact} Impact
                                    </span>
                                    <p className="text-xs sm:text-sm font-bold text-foreground break-words">{s.title}</p>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed break-words">{s.description}</p>
                            </div>
                            <div className="flex gap-2 shrink-0 self-end sm:self-start">
                                <button
                                    onClick={() => handleFeedback(s.id, 'rejected')}
                                    className="p-1.5 sm:p-2 rounded-lg bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                                    title="Discard"
                                >
                                    <X size={16} />
                                </button>
                                <button
                                    onClick={() => handleFeedback(s.id, 'accepted')}
                                    className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-lg shadow-primary/10 cursor-pointer"
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
