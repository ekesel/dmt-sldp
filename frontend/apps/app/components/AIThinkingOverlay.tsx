"use client";
import React from 'react';
import { Sparkles } from 'lucide-react';

interface AIThinkingOverlayProps {
    progress: number;
    status: string;
}

export const AIThinkingOverlay: React.FC<AIThinkingOverlayProps> = ({ progress, status }) => {
    return (
        <div className="relative overflow-hidden rounded-xl bg-slate-900/60 border border-brand-primary/20 p-8 flex flex-col items-center justify-center min-h-[200px] animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                <div className="p-3 rounded-full bg-brand-primary/10 text-brand-primary">
                    <Sparkles size={32} className="animate-spin-slow" />
                </div>

                <div>
                    <h3 className="text-xl font-bold text-white mb-1">AI is Thinking...</h3>
                    <p className="text-sm text-slate-400 font-medium">{status}</p>
                </div>

                <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
                    <div
                        className="h-full bg-brand-primary transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{progress}% Complete</p>
            </div>
        </div>
    );
};
