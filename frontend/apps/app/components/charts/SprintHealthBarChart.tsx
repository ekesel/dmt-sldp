import React, { useState, useEffect } from 'react';
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

interface SprintHealthBarChartProps {
    data: any[];
    sprintA: string;
    sprintB: string;
}

export const SprintHealthBarChart: React.FC<SprintHealthBarChartProps> = ({ data, sprintA, sprintB }) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!data || data.length === 0) return null;

    if (!isMounted) {
        return (
            <div className="flex flex-col gap-4 sm:gap-6 w-full h-full min-w-0">
                <h3 className="font-bold text-foreground text-sm sm:text-lg uppercase tracking-wider border-b border-border pb-3 sm:pb-4">Sprint Health Comparison</h3>
                <div className="h-64 sm:h-[21.875rem] w-full min-w-0 mt-2 sm:mt-4" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 sm:gap-6 w-full h-full min-w-0">
            <h3 className="font-bold text-foreground text-sm sm:text-lg uppercase tracking-wider border-b border-border pb-3 sm:pb-4">Sprint Health Comparison</h3>
            <div className="w-full overflow-x-auto overflow-y-hidden chart-scrollbar pb-2">
                <div className="h-64 sm:h-[21.875rem] w-full min-w-[520px] mt-2 sm:mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis 
                                dataKey="subject" 
                                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10, fontWeight: 500 }}
                                interval={0}
                                axisLine={false}
                                tickLine={false}
                                angle={-25}
                                textAnchor="end"
                                height={55}
                            />
                            <YAxis 
                                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                width={35}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', color: 'var(--color-popover-foreground)', borderRadius: '0.75rem', boxShadow: '0 0.625rem 0.9375rem -0.1875rem rgba(0,0,0,0.3)' }}
                                itemStyle={{ color: 'var(--color-popover-foreground)' }}
                                cursor={{ fill: 'var(--color-muted)', opacity: 0.2 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: '1rem' }} />
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
        </div>
    );
};
