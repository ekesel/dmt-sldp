'use client';

import React from 'react';
import { LayoutDashboard, Plus, Search } from "lucide-react";
import { DashboardLayout } from '../components/DashboardLayout';

export default function ProjectsPage() {
    const mockProjects = [
        { id: 'p1', name: 'Core Platform', tenant: 'Acme Corp', health: 98 },
        { id: 'p2', name: 'Mobile App', tenant: 'Acme Corp', health: 85 },
        { id: 'p3', name: 'Data Pipeline', tenant: 'Globex', health: 92 },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
                            <LayoutDashboard className="text-blue-500" />
                            Project Management
                        </h1>
                        <p className="text-slate-400">System-wide projects and their health status.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition">
                            <Plus size={18} />
                            New Project
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {mockProjects.map((p) => (
                        <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-4 hover:border-slate-700 transition">
                            <div>
                                <h3 className="text-xl font-semibold text-white">{p.name}</h3>
                                <p className="text-slate-400 text-sm">Tenant: {p.tenant}</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider">Health Score</p>
                                    <p className={`font-bold ${p.health > 90 ? 'text-blue-400' : 'text-amber-400'}`}>{p.health}%</p>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${p.health > 90 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                        style={{ width: `${p.health}%` }}
                                    />
                                </div>
                            </div>

                            <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg mt-2 transition text-sm font-medium">
                                Configure Sources
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
