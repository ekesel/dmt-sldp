import { Card, Button } from "@dmt/ui";
import { RefreshCw, Search, Database, Play } from "lucide-react";
import React from "react";

export default function SourceDetailPage({ params }: { params: { id: string; sourceId: string } }) {
    return (
        <main className="min-h-screen bg-brand-dark p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <Database className="text-brand-primary" />
                            Source Details: {params.sourceId}
                        </h1>
                        <p className="text-slate-400">Configure field mapping and data synchronization triggers.</p>
                    </div>
                    <div className="flex gap-4">
                        <Button className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/80">
                            <Search size={18} />
                            Trigger Field Discovery
                        </Button>
                        <Button className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/80">
                            <Play size={18} />
                            Trigger Sync
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="space-y-4">
                        <h2 className="text-xl font-semibold text-white">Field Mappings</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10 italic text-slate-500">
                                Run Discovery to populate available fields...
                            </div>
                        </div>
                    </Card>

                    <Card className="space-y-4">
                        <h2 className="text-xl font-semibold text-white">Sync Status & Logs</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Current Phase:</span>
                                <span className="text-brand-accent font-medium">Idle</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full" />
                            <div className="bg-black/40 rounded-lg p-4 font-mono text-xs text-emerald-400/70 h-48 overflow-y-auto">
                                {`[${new Date().toISOString()}] System ready for manual sync.`}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </main>
    );
}
