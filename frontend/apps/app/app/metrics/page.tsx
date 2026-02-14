import { Card, Button } from "@dmt/ui";
import { Users, BarChart2, CheckCircle2, XCircle } from "lucide-react";
import React from "react";

export default function MetricsPage() {
    const mockDevs = [
        { name: "Alice Jenkins", throughput: "12 PRs", quality: "95%", status: "On Track" },
        { name: "Bob Smith", throughput: "8 PRs", quality: "78%", status: "Needs Review" },
        { name: "Charlie Day", throughput: "15 PRs", quality: "98%", status: "Exceeding" },
    ];

    return (
        <main className="min-h-screen bg-brand-dark p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Users className="text-brand-primary" />
                            Contributor Performance
                        </h1>
                        <p className="text-slate-400">Throughput and quality metrics at the individual level.</p>
                    </div>
                </header>

                <Card className="overflow-hidden border-white/5">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-slate-400 text-sm uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Developer</th>
                                <th className="px-6 py-4 font-semibold text-center">Throughput</th>
                                <th className="px-6 py-4 font-semibold text-center">Quality (DMT)</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {mockDevs.map((dev, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{dev.name}</td>
                                    <td className="px-6 py-4 text-center text-slate-300">{dev.throughput}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-bold ${parseFloat(dev.quality) >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {dev.quality}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${dev.status === 'Exceeding' ? 'bg-brand-accent/20 text-brand-accent' :
                                                dev.status === 'On Track' ? 'bg-brand-primary/20 text-brand-primary' :
                                                    'bg-amber-400/20 text-amber-400'
                                            }`}>
                                            {dev.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button className="bg-slate-700 hover:bg-slate-600 text-xs">View Insights</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>
        </main>
    );
}
