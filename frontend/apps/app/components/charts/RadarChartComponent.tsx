import React from 'react';
import { Card } from '@dmt/ui';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
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
            <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
                        <PolarGrid stroke="var(--color-border)" />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11, fontWeight: 500 }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                        <Radar
                            name={sprintA || "Sprint A"}
                            dataKey="A"
                            stroke="var(--color-primary)"
                            fill="var(--color-primary)"
                            fillOpacity={0.3}
                        />
                        <Radar
                            name={sprintB || "Sprint B"}
                            dataKey="B"
                            stroke="var(--color-accent)"
                            fill="var(--color-accent)"
                            fillOpacity={0.3}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', color: 'var(--color-popover-foreground)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                            itemStyle={{ color: 'var(--color-popover-foreground)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: '20px' }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
