"use client";
import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

interface VelocityData {
    sprint_name: string;
    velocity: number;
    total_story_points_completed: number;
}

interface VelocityChartProps {
    data: VelocityData[];
}

export const VelocityChart: React.FC<VelocityChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="h-full flex items-center justify-center text-slate-500">No velocity data available</div>;
    }

    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorVel" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                        dataKey="sprint_name"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value} SP`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #ffffff10',
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="velocity"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorVel)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
