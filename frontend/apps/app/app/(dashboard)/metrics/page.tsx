"use client";
import React, { useEffect, useState } from 'react';
import { Card } from "@dmt/ui";
import { TrendingUp, Search, Users, ArrowRight } from "lucide-react";
import { developers, Developer } from "@dmt/api";
import Link from 'next/link';

export default function MetricsPage() {
    const [developerList, setDeveloperList] = useState<Developer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchDevelopers = async () => {
            try {
                const data = await developers.list();
                // Deduplicate client-side by email (lowercase) to prevent React duplicate key errors
                const seen = new Set<string>();
                const deduped = data.filter((dev: Developer) => {
                    const key = (dev.developer_email || '').trim().toLowerCase();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                // Pick the best name (prefer names with spaces over single-word ones)
                const withBestName = deduped.map((dev: Developer) => {
                    const all = data.filter(
                        (d: Developer) => d.developer_email?.trim().toLowerCase() === dev.developer_email?.trim().toLowerCase()
                    );
                    const bestName = all.reduce((best: string, d: Developer) => {
                        const n = d.developer_name || '';
                        return (n.length > best.length && n.includes(' ')) ? n : best;
                    }, dev.developer_name || dev.developer_email);
                    return { ...dev, developer_name: bestName };
                });
                setDeveloperList(withBestName);
            } catch (error) {
                console.error("Failed to fetch developers", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDevelopers();
    }, []);

    const filteredDevelopers = developerList.filter(dev =>
        (dev.developer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dev.developer_email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-brand-dark p-8 pb-20 selection:bg-brand-primary/30">
            <div className="max-w-7xl mx-auto space-y-10">
                <header className="flex justify-between items-end border-b border-white/5 pb-8">
                    <div>
                        <div className="flex items-center gap-2 text-brand-primary text-sm font-bold tracking-wider uppercase mb-2">
                            <TrendingUp size={16} />
                            Individual Performance
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                            Developer Metrics
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">Track individual contributions and compliance across all projects.</p>
                    </div>
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/5">
                        <Users size={20} className="text-brand-primary" />
                        <span className="text-2xl font-black text-white">{filteredDevelopers.length}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Members</span>
                    </div>
                </header>

                <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-white/5 shadow-inner">
                    <Search className="text-slate-500 flex-shrink-0" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="bg-transparent border-none focus:outline-none text-white w-full placeholder-slate-600 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 bg-slate-900/40 border border-white/5 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDevelopers.map((dev) => {
                            // Use lowercase email as uniqueness key
                            const uniqueKey = (dev.developer_email || '').trim().toLowerCase() || dev.id;
                            const initial = (dev.developer_name || dev.developer_email || '?').charAt(0).toUpperCase();
                            const projectCount = dev.projects?.length || 0;
                            return (
                                <Card key={uniqueKey} className="p-6 bg-slate-900/40 border-white/5 hover:border-brand-primary/40 transition-all duration-300 cursor-pointer group rounded-2xl hover:bg-slate-900/60 hover:shadow-xl hover:shadow-brand-primary/5">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-2xl group-hover:bg-brand-primary group-hover:text-white transition-all duration-300 border border-brand-primary/20 group-hover:border-transparent shadow-inner relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/0 to-brand-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <span className="relative z-10">{initial}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-black text-white text-lg leading-tight truncate group-hover:text-brand-primary transition-colors">{dev.developer_name}</h3>
                                            <p className="text-sm text-slate-500 truncate font-medium">{dev.developer_email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap mb-6">
                                        {dev.projects?.slice(0, 2).map((p: { id: number, name: string }) => (
                                            <span key={p.id} className="px-2.5 py-1 rounded-full bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-wider border border-white/5">
                                                {p.name}
                                            </span>
                                        ))}
                                        {projectCount > 2 && (
                                            <span className="px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-wider border border-brand-primary/20">
                                                +{projectCount - 2} more
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                        <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">{projectCount} Project{projectCount !== 1 ? 's' : ''}</span>
                                        <Link href={`/metrics/${encodeURIComponent(dev.id)}`} className="flex items-center gap-1.5 text-brand-primary font-black text-xs uppercase tracking-widest hover:gap-3 transition-all duration-200 group-hover:underline underline-offset-2">
                                            Analyze <ArrowRight size={12} />
                                        </Link>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
