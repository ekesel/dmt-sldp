import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  color?: 'indigo' | 'emerald' | 'amber';
}

export default function MetricCard({ label, value, color = 'indigo' }: MetricCardProps) {
  const colorClasses = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
      <p className="text-sm text-slate-400 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}
