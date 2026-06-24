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
        <div className="w-full h-full min-h-[18.75rem]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 80, bottom: 30 }}>
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
                        height={110}
                        tick={(props: any) => {
                            const { x, y, payload } = props;
                            const value = payload.value || '';
                            let line1 = value;
                            let line2 = '';
                            
                            if (value.length > 25) {
                                // Find a sensible place to split
                                const mid = Math.floor(value.length / 2);
                                let splitIndex = value.lastIndexOf(' ', mid + 8);
                                if (splitIndex === -1 || splitIndex < 10) {
                                    splitIndex = value.indexOf(' ', mid - 5);
                                }
                                if (splitIndex !== -1) {
                                    line1 = value.substring(0, splitIndex);
                                    line2 = value.substring(splitIndex + 1);
                                } else {
                                    line1 = value.substring(0, mid);
                                    line2 = value.substring(mid);
                                }
                            }

                            return (
                                <g transform={`translate(${x},${y})`}>
                                    <text
                                        x={0}
                                        y={0}
                                        dy={16}
                                        textAnchor="end"
                                        fill="var(--color-muted-foreground)"
                                        fontSize={11}
                                        transform="rotate(-25)"
                                    >
                                        <tspan x={0} dy="0em">{line1}</tspan>
                                        {line2 && <tspan x={0} dy="1.2em">{line2}</tspan>}
                                    </text>
                                </g>
                            );
                        }}
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
                            borderRadius: '0.5rem',
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
