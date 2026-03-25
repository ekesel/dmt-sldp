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
    <div className="bg-card border border-border p-6 rounded-xl min-h-[300px]">
      <h3 className="font-semibold text-foreground mb-4">Avg Cycle Time (Weekly)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)' }}
              cursor={{ fill: 'var(--color-muted)' }}
            />
            <Bar dataKey="days" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.days > 4 ? 'var(--color-destructive)' : entry.days > 3 ? 'var(--color-warning)' : 'var(--color-accent)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
