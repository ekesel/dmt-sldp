'use client';

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Plus, Search, Loader2 } from "lucide-react";
import { DashboardLayout } from '../components/DashboardLayout';
import { projects, Project } from '@dmt/api';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function ProjectsPage() {
    const router = useRouter();
    const [projectList, setProjectList] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setIsLoading(true);
            const data = await projects.list();
            setProjectList(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load projects");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
                            <LayoutDashboard className="text-primary" />
                            Project Management
                        </h1>
                        <p className="text-muted-foreground">System-wide projects and their health status.</p>
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
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg font-medium transition">
                            <Plus size={18} />
                            New Project
                        </button>
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {projectList.map((p) => (
                            <div key={p.id} className="bg-card/50 border border-border rounded-xl p-6 flex flex-col gap-4 hover:border-primary/50 transition">
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground">{p.name}</h3>
                                    <p className="text-muted-foreground text-sm">Tenant: {(p as any).tenant_name || 'Global'}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <p className="text-muted-foreground text-xs uppercase tracking-wider">Health Score</p>
                                        <p className={`font-bold ${(p as any).health > 90 ? 'text-primary' : 'text-warning'}`}>{(p as any).health || 0}%</p>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${(p as any).health > 90 ? 'bg-primary' : 'bg-warning'}`}
                                            style={{ width: `${(p as any).health || 0}%` }}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push(`/projects/${p.id}/sources`)}
                                    className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground py-2 rounded-lg mt-2 transition text-sm font-medium border border-border"
                                >
                                    Configure Sources
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
