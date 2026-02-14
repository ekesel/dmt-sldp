"use client";
import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

const mockData = [
    { name: 'Sprint 1', velocity: 32, throughput: 28 },
    { name: 'Sprint 2', velocity: 40, throughput: 35 },
    { name: 'Sprint 3', velocity: 38, throughput: 36 },
    { name: 'Sprint 4', velocity: 48, throughput: 42 },
];

export const VelocityChart = () => (
    <div className="w-full h-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData}>
                <defs>
                    <linearGradient id="colorVel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorThr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis
                    dataKey="name"
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
                <Area
                    type="monotone"
                    dataKey="throughput"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorThr)"
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);
