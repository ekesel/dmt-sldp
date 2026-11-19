"use client";

import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';

export interface WorkloadData {
    name: string;
    points_a: number;
    points_b: number;
    items_a: number;
    items_b: number;
}

interface Props {
    data: WorkloadData[];
    type: 'points' | 'items';
    sprintAName: string;
    sprintBName: string;
}

const WorkloadDistributionChart = ({ data, type, sprintAName, sprintBName }: Props) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const dataKeyA = type === 'points' ? 'points_a' : 'items_a';
    const dataKeyB = type === 'points' ? 'points_b' : 'items_b';
    const label = type === 'points' ? 'Story Points' : 'Work Items';

    // Sort by type_b descending for better visualization
    const sortedData = [...data].sort((a, b) => (b[dataKeyB] as number) - (a[dataKeyB] as number));

    if (!isMounted) {
        return <div className="w-full h-72 sm:h-[25rem] min-w-0" />;
    }

    return (
        <div className="w-full overflow-x-auto overflow-y-hidden chart-scrollbar pb-2">
            <div className="w-full h-72 sm:h-[25rem] min-w-[460px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={sortedData}
                        layout="vertical"
                        margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                        barSize={18}
                        barGap={4}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis
                            type="number"
                            stroke="var(--color-muted-foreground)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            dataKey="name"
                            type="category"
                            stroke="var(--color-muted-foreground)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            width={85}
                            tickFormatter={(val: string) => val && val.length > 12 ? `${val.slice(0, 11)}…` : val}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--color-popover)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '0.5rem',
                                color: 'var(--color-popover-foreground)'
                            }}
                            cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                        />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            wrapperStyle={{ paddingBottom: '1rem', fontSize: '0.75rem' }}
                        />
                        <Bar
                            name={`${sprintAName} (${label})`}
                            dataKey={dataKeyA}
                            fill="var(--color-primary)"
                            radius={[0, 4, 4, 0]}
                            opacity={0.6}
                        />
                        <Bar
                            name={`${sprintBName} (${label})`}
                            dataKey={dataKeyB}
                            fill="var(--color-accent)"
                            radius={[0, 4, 4, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default WorkloadDistributionChart;
