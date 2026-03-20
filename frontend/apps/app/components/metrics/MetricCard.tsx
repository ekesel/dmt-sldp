import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  color?: 'indigo' | 'emerald' | 'amber';
}

export default function MetricCard({ label, value, color = 'indigo' }: MetricCardProps) {
  const colorClasses = {
    indigo: 'text-primary',
    emerald: 'text-emerald-500',
    amber: 'text-warning',
  };

  return (
    <div className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}
