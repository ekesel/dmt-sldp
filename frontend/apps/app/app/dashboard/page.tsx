"use client";
import React from 'react';
import { Card } from "@dmt/ui";
import { Rocket, FileText, Share2, BarChart3 } from "lucide-react";
import { KPICard } from "../components/KPISection";
import { VelocityChart } from "../components/charts/VelocityChart";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-brand-dark p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Rocket className="text-brand-accent" />
              Company Analytics
            </h1>
            <p className="text-slate-400">Project visibility and engineering performance metrics.</p>
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <Share2 size={18} />
              Share
            </button>
            <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <FileText size={18} />
              Export
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard
            label="Sprint Velocity"
            value="48.5 SP"
            trend={{ direction: 'up', value: '12%' }}
            description="Average over last 3 sprints"
          />
          <KPICard
            label="Cycle Time"
            value="3.2 Days"
            trend={{ direction: 'down', value: '0.4d' }}
            description="Target: < 3.0 Days"
          />
          <KPICard
            label="DMT Compliance"
            value="94%"
            trend={{ direction: 'neutral', value: '0%' }}
            description="Minimum Threshold: 80%"
          />
          <KPICard
            label="Resolved Blockers"
            value="14"
            trend={{ direction: 'up', value: '5' }}
            description="This sprint"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 min-h-[400px] flex flex-col p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <BarChart3 className="text-brand-primary" />
                Velocity & Throughput Trend
              </h2>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-brand-primary" />
                  Velocity (Planned)
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-brand-accent" />
                  Throughput (Done)
                </div>
              </div>
            </div>
            <VelocityChart />
          </Card>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Active Alerts</h2>
            <Card className="bg-rose-500/10 border-rose-500/20">
              <p className="text-rose-400 font-medium">Critical Blocker</p>
              <p className="text-rose-200/60 text-sm mt-2">DMT-123: Missing test evidence for production release.</p>
            </Card>
            <Card className="bg-amber-500/10 border-amber-500/20">
              <p className="text-amber-400 font-medium">Compliance Warning</p>
              <p className="text-amber-200/60 text-sm mt-2">Team B: Unit coverage dropped below 80%.</p>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
