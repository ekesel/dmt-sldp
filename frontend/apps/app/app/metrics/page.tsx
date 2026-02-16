"use client";
import React, { useEffect, useState } from 'react';
import { Card } from "@dmt/ui";
import { User, TrendingUp, Search } from "lucide-react";

interface Developer {
    developer_source_id: string;
    developer_name: string;
    developer_email: string;
}

export default function MetricsPage() {
    const [developers, setDevelopers] = useState<Developer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchDevelopers = async () => {
            try {
                const response = await fetch('/api/developers/');
                if (response.ok) {
                    const data = await response.json();
                    setDevelopers(data);
                }
            } catch (error) {
                console.error("Failed to fetch developers", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDevelopers();
    }, []);

    const filteredDevelopers = developers.filter(dev =>
        dev.developer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.developer_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-brand-dark p-8 selection:bg-brand-primary/30">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-end border-b border-white/5 pb-8">
                    <div>
                        <div className="flex items-center gap-2 text-brand-primary text-sm font-bold tracking-wider uppercase mb-2">
                            <TrendingUp size={16} />
                            Individual Performance
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                            Developer Metrics
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">Track individual contributions and compliance.</p>
                    </div>
                </header>

                <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-white/5">
                    <Search className="text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search developers..."
                        className="bg-transparent border-none focus:outline-none text-white w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <p className="text-slate-400">Loading...</p>
                    ) : filteredDevelopers.map((dev) => (
                        <Card key={dev.developer_source_id} className="p-6 bg-slate-800/20 border-white/5 hover:border-brand-primary/50 transition-all cursor-pointer group">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xl group-hover:bg-brand-primary group-hover:text-white transition-colors">
                                    {dev.developer_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{dev.developer_name}</h3>
                                    <p className="text-sm text-slate-400">{dev.developer_email}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                <span className="text-sm text-slate-500">View Details</span>
                                <a href={`/metrics/${dev.developer_source_id}`} className="text-brand-primary font-bold text-sm hover:underline">
                                    Analyze &rarr;
                                </a>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </main>
    );
}
