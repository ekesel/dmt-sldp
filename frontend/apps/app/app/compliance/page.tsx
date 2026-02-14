import { Card, Button } from "@dmt/ui";
import { ShieldAlert, Filter, CheckCircle, Clock } from "lucide-react";
import React from "react";

export default function CompliancePage() {
    const mockFlags = [
        { id: "f1", type: "Missing Test", item: "PR-452: Auth Engine", age: "4h", severity: "High" },
        { id: "f2", type: "Low Coverage", item: "Service: IdentityMapping", age: "2d", severity: "Medium" },
        { id: "f3", type: "Stale PR", item: "PR-410: Kafka Refactor", age: "5d", severity: "Low" },
    ];

    return (
        <main className="min-h-screen bg-brand-dark p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <ShieldAlert className="text-rose-400" />
                            Compliance Flag Center
                        </h1>
                        <p className="text-slate-400">Monitor and remediate quality violations across tools.</p>
                    </div>
                    <Button className="bg-slate-700 hover:bg-slate-600 flex items-center gap-2">
                        <Filter size={18} />
                        Filter Flags
                    </Button>
                </header>

                <div className="grid grid-cols-1 gap-4">
                    {mockFlags.map((f) => (
                        <Card key={f.id} className="flex items-center justify-between border-rose-500/10 hover:border-rose-500/30 transition-all">
                            <div className="flex items-center gap-6">
                                <div className={`p-3 rounded-lg ${f.severity === 'High' ? 'bg-rose-500/20 text-rose-400' :
                                        f.severity === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-slate-500/20 text-slate-400'
                                    }`}>
                                    <ShieldAlert size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{f.type}</h3>
                                    <p className="text-slate-400 text-sm">{f.item}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-12">
                                <div className="text-center">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider">Age</p>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Clock size={14} />
                                        <p className="font-medium">{f.age}</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider">Severity</p>
                                    <p className={`font-bold uppercase text-xs ${f.severity === 'High' ? 'text-rose-400' :
                                            f.severity === 'Medium' ? 'text-amber-400' : 'text-slate-400'
                                        }`}>{f.severity}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button className="bg-emerald-500 hover:bg-emerald-600 p-2">
                                        <CheckCircle size={18} />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </main>
    );
}
