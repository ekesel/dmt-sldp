import { Card } from "@dmt/ui";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import React from "react";

interface KPIProps {
    label: string;
    value: string;
    trend?: {
        value: string;
        direction: 'up' | 'down' | 'neutral';
    };
    description?: string;
}

export const KPICard = ({ label, value, trend, description }: KPIProps) => (
    <Card className="flex flex-col gap-2">
        <h3 className="text-slate-400 text-sm font-medium">{label}</h3>
        <div className="flex items-end gap-3">
            <p className="text-3xl font-bold text-white">{value}</p>
            {trend && (
                <div className={`flex items-center gap-1 text-xs mb-1 font-medium ${trend.direction === 'up' ? 'text-emerald-400' :
                        trend.direction === 'down' ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                    {trend.direction === 'up' ? <TrendingUp size={14} /> :
                        trend.direction === 'down' ? <TrendingDown size={14} /> : <Minus size={14} />}
                    <span>{trend.value}</span>
                </div>
            )}
        </div>
        {description && <p className="text-slate-500 text-xs mt-1">{description}</p>}
    </Card>
);
