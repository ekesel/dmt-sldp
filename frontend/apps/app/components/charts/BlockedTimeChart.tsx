import React from 'react';
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
    if (!data || data.length === 0) return null;

    return (
        <div className="flex flex-col gap-6 w-full h-full">
            <h3 className="font-bold text-slate-300 text-lg uppercase tracking-wider border-b border-white/5 pb-4">Blocked Time Analysis</h3>
            <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="sprint"
                            stroke="rgba(255,255,255,0.3)"
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="rgba(255,255,255,0.3)"
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: '25px' }} />
                        <Bar dataKey="total_blocked_days" name="Total Blocked Days" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={32} />
                        <Bar dataKey="avg_blocked_days" name="Avg Blocked Days/Item" fill="#fb923c" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
