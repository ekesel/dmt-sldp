import { Card, Button } from "@dmt/ui";
import { LayoutDashboard, Plus, Search } from "lucide-react";
import React from 'react';

export default function ProjectsPage() {
    const mockProjects = [
        { id: 'p1', name: 'Core Platform', tenant: 'Acme Corp', health: 98 },
        { id: 'p2', name: 'Mobile App', tenant: 'Acme Corp', health: 85 },
        { id: 'p3', name: 'Data Pipeline', tenant: 'Globex', health: 92 },
    ];

    return (
        <main className="min-h-screen bg-brand-dark p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <LayoutDashboard className="text-brand-accent" />
                            Project Management
                        </h1>
                        <p className="text-slate-400">System-wide projects and their health status.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                className="bg-brand-dark border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                        </div>
                        <Button className="flex items-center gap-2">
                            <Plus size={18} />
                            New Project
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {mockProjects.map((p) => (
                        <Card key={p.id} className="flex flex-col gap-4">
                            <div>
                                <h3 className="text-xl font-semibold text-white">{p.name}</h3>
                                <p className="text-slate-400 text-sm">Tenant: {p.tenant}</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <p className="text-slate-400 text-xs">Health Score</p>
                                    <p className={`font-bold ${p.health > 90 ? 'text-brand-accent' : 'text-amber-400'}`}>{p.health}%</p>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${p.health > 90 ? 'bg-brand-accent' : 'bg-amber-400'}`}
                                        style={{ width: `${p.health}%` }}
                                    />
                                </div>
                            </div>

                            <Button className="w-full bg-slate-700 hover:bg-slate-600 mt-2">
                                Configure Sources
                            </Button>
                        </Card>
                    ))}
                </div>
            </div>
        </main>
    );
}
