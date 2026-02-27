"use client";
import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

interface TrendingChartProps {
    data: any[];
    dataKey: string;
    color?: string;
    label?: string;
    type?: 'line' | 'area';
    valuePrefix?: string;
    valueSuffix?: string;
}

export const TrendingChart: React.FC<TrendingChartProps> = ({
    data,
    dataKey,
    color = "#3b82f6",
    label,
    type = 'line',
    valuePrefix = '',
    valueSuffix = ''
}) => {
    // Reverse data for chronological display (backend returns latest first)
    const chartData = [...data].reverse();

    const CustomTooltip = ({ active, payload, label: xLabel }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-white/10 p-3 rounded-lg shadow-xl text-xs">
                    <p className="text-slate-400 font-bold mb-1">{xLabel}</p>
                    <p style={{ color }}>
                        {label || dataKey}: <span className="text-white font-bold">{valuePrefix}{payload[0].value}{valueSuffix}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                {type === 'line' ? (
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="sprint_name"
                            hide
                        />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={3}
                            dot={{ fill: color, r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                            animationDuration={1500}
                        />
                    </LineChart>
                ) : (
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="sprint_name"
                            hide
                        />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            fillOpacity={1}
                            fill={`url(#color-${dataKey})`}
                            strokeWidth={2}
                            animationDuration={1500}
                        />
                    </AreaChart>
                )}
            </ResponsiveContainer>
        </div>
    );
};
