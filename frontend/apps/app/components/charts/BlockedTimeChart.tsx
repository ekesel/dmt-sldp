import React, { useState, useEffect } from 'react';
import { Card } from '@dmt/ui';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface BlockedTimeChartProps {
    data: any[];
}

export const BlockedTimeChart: React.FC<BlockedTimeChartProps> = ({ data }) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!data || data.length === 0) return null;

    if (!isMounted) {
        return (
            <div className="flex flex-col gap-4 sm:gap-6 w-full h-full min-w-0">
                <h3 className="font-bold text-foreground text-sm sm:text-lg uppercase tracking-wider border-b border-border pb-3 sm:pb-4">Blocked Time Analysis</h3>
                <div className="h-60 sm:h-[18.75rem] w-full min-w-0 mt-2 sm:mt-4" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 sm:gap-6 w-full h-full min-w-0">
            <h3 className="font-bold text-foreground text-sm sm:text-lg uppercase tracking-wider border-b border-border pb-3 sm:pb-4">Blocked Time Analysis</h3>
            <div className="w-full overflow-x-auto overflow-y-hidden chart-scrollbar pb-2">
                <div className="h-60 sm:h-[18.75rem] w-full min-w-[420px] mt-2 sm:mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis
                                dataKey="sprint"
                                stroke="var(--color-muted-foreground)"
                                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10, fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                dy={5}
                            />
                            <YAxis
                                stroke="var(--color-muted-foreground)"
                                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10, fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={35}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--color-muted)' }}
                                contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', color: 'var(--color-popover-foreground)', borderRadius: '0.75rem', boxShadow: '0 0.625rem 0.9375rem -0.1875rem rgba(0,0,0,0.3)' }}
                                itemStyle={{ color: 'var(--color-popover-foreground)' }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: '1rem' }} />
                            <Bar dataKey="total_blocked_days" name="Total Blocked Days" fill="var(--color-destructive)" radius={[6, 6, 0, 0]} barSize={28} />
                            <Bar dataKey="avg_blocked_days" name="Avg Blocked Days/Item" fill="var(--color-accent)" radius={[6, 6, 0, 0]} barSize={28} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
