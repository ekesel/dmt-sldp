import { Card } from "@dmt/ui";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import React from "react";

interface KPIProps {
    label: string;
    value: string;
    trend?: {
        value: string;
        direction: 'up' | 'down' | 'neutral';
        sentiment?: 'positive' | 'negative' | 'neutral';
    };
    description?: React.ReactNode;
}

export const KPICard = ({ label, value, trend, description }: KPIProps) => {
    const getSentimentColor = () => {
        if (!trend) return 'text-slate-400';
        if (trend.sentiment) {
            return trend.sentiment === 'positive' ? 'text-emerald-400' :
                trend.sentiment === 'negative' ? 'text-rose-400' : 'text-slate-400';
        }
        return trend.direction === 'up' ? 'text-emerald-400' :
            trend.direction === 'down' ? 'text-rose-400' : 'text-slate-400';
    };

    return (
        <Card className="flex flex-col gap-3 p-5 hover:border-brand-primary/40 transition-colors duration-200 group">
            <h3 className="text-slate-400 text-sm font-medium group-hover:text-slate-300 transition-colors uppercase tracking-wider">{label}</h3>
            <div className="flex items-end gap-3 flex-wrap">
                <p className="text-4xl font-bold text-white tracking-tight">{value}</p>
                {trend && (
                    <div className={`flex items-center gap-1.5 text-sm mb-1 font-bold ${getSentimentColor()}`}>
                        {trend.direction === 'up' ? <TrendingUp size={16} /> :
                            trend.direction === 'down' ? <TrendingDown size={16} /> : <Minus size={16} />}
                        <span>{trend.value}</span>
                    </div>
                )}
            </div>
            {description && <div className="text-slate-500 text-xs mt-auto font-medium leading-relaxed border-t border-white/5 pt-2">{description}</div>}
        </Card>
    );
};
