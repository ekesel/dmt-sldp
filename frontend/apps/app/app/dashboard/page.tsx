'use client';
import React from 'react';
import MetricCard from '../../components/metrics/MetricCard';
import ComplianceChart from '../../components/charts/ComplianceChart';
import CycleTimeChart from '../../components/charts/CycleTimeChart';
import AIInsightsPanel from './AIInsightsPanel';
import { useDashboardData } from '../../hooks/useDashboardData';

export default function DashboardPage() {
  const { metrics, loading, refresh } = useDashboardData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">Company Dashboard</h1>
          <p className="text-slate-400">Real-time DMT compliance and SLDP metrics.</p>
        </div>
        <button 
          onClick={refresh}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Refresh Data
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="DMT Compliance" 
          value={`${metrics?.compliance_rate}%`} 
          trend="+2.4%" 
          status="good" 
        />
        <MetricCard 
          title="Avg Cycle Time" 
          value={metrics?.avg_cycle_time || 'N/A'} 
          trend="-0.5 days" 
          status="good" 
        />
        <MetricCard 
          title="Sprint Velocity" 
          value={metrics?.sprint_velocity || 0} 
          trend="+5.2" 
          status="neutral" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceChart />
        <CycleTimeChart />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AIInsightsPanel />
      </div>
    </div>
  );
}
