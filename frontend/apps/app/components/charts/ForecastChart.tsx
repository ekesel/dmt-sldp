"use client";
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ForecastChartProps {
    data: Record<string, string>; // Percentile -> ISO Date
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ data }) => {
    if (!data) return <div className="h-full flex items-center justify-center text-slate-500">No forecast data</div>;

    // Transform data for Recharts
    // We want to show a probability curve. We can represent percentiles as "Accumulated Probability"
    const chartData = Object.entries(data)
        .map(([percentile, dateStr]) => ({
            percentile: parseInt(percentile),
            date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            displayDate: new Date(dateStr).toLocaleDateString(),
            probability: parseInt(percentile) / 100
        }))
        .sort((a, b) => a.percentile - b.percentile);

    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 25, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        hide
                        domain={[0, 1]}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #ffffff10',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                        itemStyle={{ color: '#6366f1' }}
                        formatter={(value: any, name: string, props: any) => [`${props.payload.percentile}% Confidence`, 'Probability']}
                    />
                    <Area
                        type="monotone"
                        dataKey="probability"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorProb)"
                    />
                    {/* Add a marker for the 85th percentile "Target" */}
                    <ReferenceLine
                        x={chartData.find(d => d.percentile === 85)?.date}
                        stroke="#ef4444"
                        strokeDasharray="3 3"
                        label={{ value: 'Target (85%)', position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
