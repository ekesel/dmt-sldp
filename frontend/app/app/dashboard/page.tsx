import React from 'react';
import MetricCard from '../../components/metrics/MetricCard';
import ComplianceChart from '../../components/charts/ComplianceChart';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">Company Dashboard</h1>
        <p className="text-slate-400">Real-time DMT compliance and SLDP metrics.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="DMT Compliance" value="84.2%" color="indigo" />
        <MetricCard label="Avg Cycle Time" value="3.4 days" color="emerald" />
        <MetricCard label="Sprint Velocity" value="42 pts" color="amber" />
      </div>

      <ComplianceChart />
    </div>
  );
}
