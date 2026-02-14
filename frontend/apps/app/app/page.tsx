import { Card, Button } from "@dmt/ui";
import { LayoutDashboard, BarChart3, Clock, Rocket } from "lucide-react";

export default function CompanyHome() {
    return (
        <main className="min-h-screen bg-brand-dark p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <Rocket className="text-brand-accent" />
                            Company Dashboard
                        </h1>
                        <p className="text-slate-400">Track team velocity, productivity, and quality metrics.</p>
                    </div>
                    <div className="flex gap-4">
                        <Button className="bg-slate-700 hover:bg-slate-600">Export Report</Button>
                        <Button>AI Insights</Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="flex flex-col gap-2">
                        <h3 className="text-slate-400 text-sm font-medium">Sprint Velocity</h3>
                        <p className="text-3xl font-bold">42 SP</p>
                        <div className="flex items-center gap-1 text-emerald-400 text-xs mt-1">
                            <span>+12% vs last sprint</span>
                        </div>
                    </Card>

                    <Card className="flex flex-col gap-2">
                        <h3 className="text-slate-400 text-sm font-medium">Cycle Time</h3>
                        <p className="text-3xl font-bold">3.4 Days</p>
                        <div className="flex items-center gap-1 text-rose-400 text-xs mt-1">
                            <span>+0.2 Days lag</span>
                        </div>
                    </Card>

                    <Card className="flex flex-col gap-2">
                        <h3 className="text-slate-400 text-sm font-medium">DMT Compliance</h3>
                        <p className="text-3xl font-bold">94%</p>
                        <div className="flex items-center gap-1 text-emerald-400 text-xs mt-1">
                            <span>Target: 80%</span>
                        </div>
                    </Card>

                    <Card className="flex flex-col gap-2">
                        <h3 className="text-slate-400 text-sm font-medium">Active Blockers</h3>
                        <p className="text-3xl font-bold">3</p>
                        <div className="flex items-center gap-1 text-amber-400 text-xs mt-1">
                            <span>Critical priority</span>
                        </div>
                    </Card>
                </div>

                <Card className="h-64 flex flex-col items-center justify-center border-dashed">
                    <BarChart3 className="text-slate-600 w-12 h-12 mb-4" />
                    <p className="text-slate-400">Velocity Trend Chart Placeholder</p>
                </Card>
            </div>
        </main>
    );
}
