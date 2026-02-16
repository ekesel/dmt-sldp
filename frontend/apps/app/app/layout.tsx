import React from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import {
    LayoutDashboard,
    BarChart2,
    ShieldCheck,
    Bell,
    Settings,
    LogOut
} from "lucide-react";
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'DMT Company Portal',
    description: 'Engineering Analytics & Compliance',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.className} flex min-h-screen bg-slate-950 text-slate-200`}>
                {/* Sidebar */}
                <aside className="w-64 border-r border-white/5 bg-slate-900/50 flex flex-col fixed h-full z-10 backdrop-blur-xl">
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center font-bold text-white">
                                D
                            </div>
                            <span className="font-bold text-lg tracking-tight text-white">DMT Company</span>
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-1">
                        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                            <LayoutDashboard size={18} />
                            Dashboard
                        </Link>
                        <Link href="/metrics" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                            <BarChart2 size={18} />
                            Metrics
                        </Link>
                        <Link href="/compliance" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                            <ShieldCheck size={18} />
                            Compliance
                        </Link>
                    </nav>

                    <div className="p-4 border-t border-white/5 space-y-1">
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                            <Settings size={18} />
                            Settings
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all">
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 ml-64 flex flex-col min-h-screen">
                    {/* Top Header */}
                    <header className="h-16 border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex items-center justify-end px-8 gap-4 sticky top-0 z-20">
                        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-slate-900"></span>
                        </button>
                        <div className="w-8 h-8 rounded-full bg-slate-700 border border-white/10"></div>
                    </header>

                    {children}
                </div>
            </body>
        </html>
    );
}
