import { Card, Button } from "@dmt/ui";
import { LayoutDashboard, Users, Settings, ShieldCheck } from "lucide-react";

export default function AdminHome() {
    return (
        <main className="min-h-screen bg-brand-dark p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <ShieldCheck className="text-brand-primary" />
                            Platform Administration
                        </h1>
                        <p className="text-slate-400">Manage tenants and global system configurations.</p>
                    </div>
                    <Button>Create New Tenant</Button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-primary/20 rounded-lg">
                                <Users className="text-brand-primary" />
                            </div>
                            <h2 className="text-xl font-semibold">Active Tenants</h2>
                        </div>
                        <p className="text-4xl font-bold">12</p>
                        <p className="text-sm text-slate-400">+2 from last month</p>
                    </Card>

                    <Card className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-accent/20 rounded-lg">
                                <LayoutDashboard className="text-brand-accent" />
                            </div>
                            <h2 className="text-xl font-semibold">System Health</h2>
                        </div>
                        <p className="text-4xl font-bold text-brand-accent">99.9%</p>
                        <p className="text-sm text-slate-400">All services operational</p>
                    </Card>

                    <Card className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-500/20 rounded-lg">
                                <Settings className="text-slate-400" />
                            </div>
                            <h2 className="text-xl font-semibold">Global Settings</h2>
                        </div>
                        <p className="text-slate-400 text-sm">Configure retention policies, AI providers, and system defaults.</p>
                        <Button className="mt-auto bg-slate-700 hover:bg-slate-600">Configure</Button>
                    </Card>
                </div>
            </div>
        </main>
    );
}
