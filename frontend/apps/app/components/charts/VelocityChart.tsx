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
        return <div className="h-full flex items-center justify-center text-muted-foreground">No velocity data available</div>;
    }

    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                    <defs>
                        <linearGradient id="colorVel" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                        dataKey="sprint_name"
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis
                        stroke="var(--color-muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value} SP`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--color-popover)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            color: 'var(--color-popover-foreground)'
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="velocity"
                        stroke="var(--color-primary)"
                        fillOpacity={1}
                        fill="url(#colorVel)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
