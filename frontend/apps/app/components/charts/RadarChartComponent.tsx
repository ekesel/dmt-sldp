import React from 'react';
import { Card } from '@dmt/ui';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';

interface RadarChartProps {
    data: any[];
    sprintA: string;
    sprintB: string;
}

export const RadarChartComponent: React.FC<RadarChartProps> = ({ data, sprintA, sprintB }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="flex flex-col gap-6 w-full h-full">
            <h3 className="font-bold text-foreground text-lg uppercase tracking-wider border-b border-border pb-4">Sprint Health Comparison</h3>
            <div className="h-[21.875rem] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis 
                            dataKey="subject" 
                            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10, fontWeight: 500 }}
                            interval={0}
                            axisLine={false}
                            tickLine={false}
                            angle={-25}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis 
                            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', color: 'var(--color-popover-foreground)', borderRadius: '0.75rem', boxShadow: '0 0.625rem 0.9375rem -0.1875rem rgba(0,0,0,0.3)' }}
                            itemStyle={{ color: 'var(--color-popover-foreground)' }}
                            cursor={{ fill: 'var(--color-muted)', opacity: 0.2 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: '1.25rem' }} />
                        <Bar
                            name={sprintA || "Sprint A"}
                            dataKey="A"
                            fill="var(--color-primary)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                        />
                        <Bar
                            name={sprintB || "Sprint B"}
                            dataKey="B"
                            fill="var(--color-accent)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
