"use client";
import React, { useEffect, useState } from 'react';
import { Card } from "@dmt/ui";
import { TrendingUp, FileText, Share2, BarChart3, AlertCircle } from "lucide-react";
import { KPICard } from "../../components/KPISection";
import { VelocityChart } from "../../components/charts/VelocityChart";
import { ForecastChart } from "../../components/charts/ForecastChart";
import { dashboard } from "@dmt/api";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboard.getMetrics(),
      dashboard.getForecast("1") // Hardcoded for Demo Integration ID
    ])
      .then(([metricsData, forecastData]) => {
        setMetrics(metricsData);
        setForecast(forecastData);
      })
      .catch(err => console.error("Failed to fetch dashboard data:", err))
      .finally(() => setLoading(false));
  }, []);

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
            value={loading ? "..." : `${metrics?.active_sprint?.total_points || 0} SP`}
            trend={{ direction: 'up', value: loading ? "..." : 'Active' }}
            description="Sum of completed story points"
          />
          <KPICard
            label="Cycle Time"
            value={loading ? "..." : `${metrics?.avg_cycle_time || 0} Days`}
            trend={{ direction: 'down', value: '0.4d' }}
            description="Average resolution duration"
          />
          <KPICard
            label="DMT Compliance"
            value={loading ? "..." : `${Math.round(metrics?.compliance_rate || 0)}%`}
            trend={{ direction: 'neutral', value: '0%' }}
            description="Minimum Threshold: 80%"
          />
          <KPICard
            label="Resolved Blockers"
            value={loading ? "..." : (metrics?.resolved_blockers || 0).toString()}
            trend={{ direction: 'up', value: 'Live' }}
            description="Bugs closed this period"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 min-h-[450px] flex flex-col p-8 bg-slate-900/40 border-white/5 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="text-brand-primary" />
                  Velocity & Throughput
                </h2>
                <p className="text-slate-500 text-sm mt-1">Sprint-over-sprint delivery trends</p>
              </div>
              <div className="flex gap-6 text-xs font-bold tracking-widest uppercase">
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-3 h-3 rounded-full bg-brand-primary shadow-sm shadow-brand-primary/50" />
                  Velocity
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-3 h-3 rounded-full bg-brand-accent shadow-sm shadow-brand-accent/50" />
                  Throughput
                </div>
              </div>
            </div>
            <div className="flex-1 w-full bg-slate-800/10 rounded-2xl border border-white/5 p-4">
              <VelocityChart />
            </div>
          </Card>

          <Card className="min-h-[450px] flex flex-col p-8 bg-slate-900/40 border-white/5 backdrop-blur-xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-brand-primary" />
                Delivery Forecast
              </h2>
              <p className="text-slate-500 text-sm mt-1">Stochastic completion prediction</p>
            </div>

            <div className="flex-1 w-full flex flex-col gap-6">
              <div className="bg-slate-800/10 rounded-2xl border border-white/5 p-4 h-[200px]">
                <ForecastChart data={forecast} />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-brand-primary/5 border border-brand-primary/10">
                  <span className="text-xs font-bold text-slate-400">85% Confidence</span>
                  <span className="text-sm font-black text-white">
                    {loading ? "..." : forecast?.["85"] ? new Date(forecast["85"]).toLocaleDateString() : "No Data"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-xs font-bold text-slate-400">50% Confidence (Aggressive)</span>
                  <span className="text-sm font-bold text-slate-300">
                    {loading ? "..." : forecast?.["50"] ? new Date(forecast["50"]).toLocaleDateString() : "No Data"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 italic">
                  * Based on Monte Carlo simulation of {metrics?.active_sprint?.item_count || 10} remaining items.
                </p>
              </div>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <AlertCircle className="text-rose-500" />
              Critical Alerts
            </h2>
            <Card className="bg-rose-500/5 border-rose-500/20 p-6 group hover:bg-rose-500/10 transition-colors cursor-default">
              <div className="flex justify-between items-start">
                <span className="px-2 py-1 rounded text-[10px] font-black uppercase bg-rose-500 text-white leading-none">High Risk</span>
                <span className="text-[10px] text-slate-500 font-bold">2H AGO</span>
              </div>
              <p className="text-rose-100 font-bold mt-4 group-hover:text-white transition-colors">DMT Compliance Drop</p>
              <p className="text-rose-200/40 text-sm mt-2 leading-relaxed">Unit testing coverage in `core-engine` dropped to 64%. Action required before sprint end.</p>
            </Card>
            <Card className="bg-amber-500/5 border-amber-500/20 p-6 group hover:bg-amber-500/10 transition-colors cursor-default">
              <div className="flex justify-between items-start">
                <span className="px-2 py-1 rounded text-[10px] font-black uppercase bg-amber-500 text-black leading-none">Warning</span>
                <span className="text-[10px] text-slate-500 font-bold">5H AGO</span>
              </div>
              <p className="text-amber-100 font-bold mt-4 group-hover:text-white transition-colors">Stagnant Pull Requests</p>
              <p className="text-amber-200/40 text-sm mt-2 leading-relaxed">3 PRs in `frontend-web` have been open for &gt; 48 hours without review.</p>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
