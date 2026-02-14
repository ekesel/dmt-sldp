import { Card, Button } from "@dmt/ui";
import { Settings, RefreshCw, Eye, AlertCircle } from "lucide-react";
import React from "react";

export default function SourceConfigPage({ params }: { params: { id: string } }) {
    const mockSources = [
        { id: "s1", type: "Jira", name: "Engineering Jira", status: "Healthy", lastSync: "2 hours ago" },
        { id: "s2", type: "GitHub", name: "Organization Repos", status: "Warning", lastSync: "1 day ago" },
    ];

    return (
        <main className="min-h-screen bg-brand-dark p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <Settings className="text-brand-primary" />
                            Source Configurations
                        </h1>
                        <p className="text-slate-400">Manage integrations for Project ID: {params.id}</p>
                    </div>
                    <Button className="flex items-center gap-2">
                        <RefreshCw size={18} />
                        Check All Status
                    </Button>
                </header>

                <div className="grid grid-cols-1 gap-4">
                    {mockSources.map((s) => (
                        <Card key={s.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-white">
                                    {s.type[0]}
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{s.name}</h3>
                                    <p className="text-slate-400 text-sm">{s.type} Integration</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-12">
                                <div className="text-center">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider">Health</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${s.status === 'Healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                        <p className={`${s.status === 'Healthy' ? 'text-emerald-400' : 'text-amber-400'} font-medium`}>{s.status}</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider">Last Sync</p>
                                    <p className="text-white font-medium">{s.lastSync}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button className="bg-slate-700 hover:bg-slate-600 p-2">
                                        <Eye size={18} />
                                    </Button>
                                    <Button className="bg-brand-primary/20 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/30 p-2">
                                        <RefreshCw size={18} />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                <Card className="bg-amber-400/10 border-amber-400/20 flex gap-4 p-4">
                    <AlertCircle className="text-amber-400 shrink-0" />
                    <p className="text-amber-200 text-sm">
                        GitHub integration requires OAuth2 refresh. Please re-authenticate to restore full data synchronization.
                    </p>
                </Card>
            </div>
        </main>
    );
}
