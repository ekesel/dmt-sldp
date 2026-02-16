"use client";
import React from 'react';
import { Card } from "@dmt/ui";
import { TrendingUp, FileText, Share2, BarChart3, AlertCircle } from "lucide-react";
import { KPICard } from "../../components/KPISection";
import { VelocityChart } from "../../components/charts/VelocityChart";
import { ForecastChart } from "../../components/charts/ForecastChart";
import { AIInsightsList } from "../../components/AIInsightsList";
import { useDashboardData } from "../../hooks/useDashboardData";

export default function DashboardPage() {
  const { summary, velocity, compliance, insights, loading, error } = useDashboardData();

  if (loading) {
    return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-white">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-rose-500">{error}</div>;
  }

  return (
    <main className="min-h-screen bg-brand-dark p-8 selection:bg-brand-primary/30">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <div className="flex items-center gap-2 text-brand-primary text-sm font-bold tracking-wider uppercase mb-2">
              <TrendingUp size={16} />
              Real-time Performance
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Company Analytics
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Monitoring engineering excellence and DMT compliance.</p>
          </div>
          <div className="flex gap-4">
            {/* Stubbed actions */}
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all font-medium border border-white/5">
              <Share2 size={18} />
              Share Report
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 transition-all font-bold shadow-lg shadow-brand-primary/20">
              <FileText size={18} />
              Export PDF
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard
            label="Sprint Velocity"
            value={`${summary?.velocity || 0} SP`}
            trend={{ direction: 'neutral', value: 'Latest' }}
            description="Average of last 5 sprints"
          />
          <KPICard
            label="Cycle Time"
            value={`${summary?.cycle_time || 0} Days`}
            trend={{ direction: 'neutral', value: 'Avg' }}
            description="Average resolution duration"
          />
          <KPICard
            label="DMT Compliance"
            value={`${Math.round(summary?.compliance_rate || 0)}%`}
            trend={{ direction: summary?.compliance_rate && summary.compliance_rate >= 80 ? 'up' : 'down', value: 'Avg' }}
            description="Minimum Threshold: 80%"
          />
          <KPICard
            label="Post-Release Defects"
            value={(summary?.defects || 0).toString()}
            trend={{ direction: 'down', value: 'Total' }}
            description="Bugs found in production"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 min-h-[450px] flex flex-col p-8 bg-slate-900/40 border-white/5 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="text-brand-primary" />
                  Velocity History
                </h2>
                <p className="text-slate-500 text-sm mt-1">Sprint-over-sprint delivery trends</p>
              </div>
            </div>
            <div className="flex-1 w-full bg-slate-800/10 rounded-2xl border border-white/5 p-4">
              <VelocityChart data={velocity} />
            </div>
          </Card>

          <Card className="min-h-[450px] flex flex-col p-8 bg-slate-900/40 border-white/5 backdrop-blur-xl">
            {/* Forecast requires separate endpoint logic or data derived from velocity */}
            {/* Placeholder for now as forecast endpoint logic in backend expects integration_id which we might not have in summary */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-brand-primary" />
                Delivery Forecast
              </h2>
              <p className="text-slate-500 text-sm mt-1">Coming Soon: Stochastic prediction</p>
            </div>
            <div className="flex-1 w-full flex items-center justify-center text-slate-500">
              Forecast data unavailable
            </div>
          </Card>

          {/* Critical Alerts - Simplified logic based on compliance */}
          <div className="lg:col-span-3 space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <AlertCircle className="text-rose-500" />
              Compliance Alerts
            </h2>
            {summary?.compliance_rate !== undefined && summary.compliance_rate < 80 && (
              <Card className="bg-rose-500/5 border-rose-500/20 p-6 group hover:bg-rose-500/10 transition-colors cursor-default">
                <div className="flex justify-between items-start">
                  <span className="px-2 py-1 rounded text-[10px] font-black uppercase bg-rose-500 text-white leading-none">High Risk</span>
                </div>
                <p className="text-rose-100 font-bold mt-4 group-hover:text-white transition-colors">Low Compliance Rate</p>
                <p className="text-rose-200/40 text-sm mt-2 leading-relaxed">Overall compliance is {summary.compliance_rate}%, below the 80% threshold.</p>
              </Card>
            )}
            {(!summary || (summary.compliance_rate >= 80)) && (
              <p className="text-slate-400">No critical alerts at this time.</p>
            )}
          </div>
        </div>

        {insights && insights.length > 0 && (
          <div className="pt-8 border-t border-white/5">
            {/* Assuming AIInsightsList can take a list or we map it */}
            {/* For now, just show the latest insight if available */}
            {/* Note: AIInsightsList expects specific props, need to check component */}
            <h2 className="text-2xl font-bold text-white mb-4">AI Insights</h2>
            <div className="grid gap-4">
              {insights.map((insight: any) => (
                <Card key={insight.id} className="p-4 bg-slate-800/20 border-white/5">
                  <h3 className="text-lg font-bold text-white">{insight.title || "Insight"}</h3>
                  <p className="text-slate-400 mt-2">{insight.summary}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
