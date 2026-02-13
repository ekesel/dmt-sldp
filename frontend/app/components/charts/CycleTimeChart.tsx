'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { week: 'W1', days: 2.8 },
  { week: 'W2', days: 3.5 },
  { week: 'W3', days: 3.1 },
  { week: 'W4', days: 4.2 },
];

export default function CycleTimeChart() {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl min-h-[300px]">
      <h3 className="font-semibold text-white mb-4">Avg Cycle Time (Weekly)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
              cursor={{ fill: '#1e293b' }}
            />
            <Bar dataKey="days" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.days > 4 ? '#ef4444' : entry.days > 3 ? '#f59e0b' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
