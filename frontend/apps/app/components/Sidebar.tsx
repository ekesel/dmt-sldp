'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BarChart2,
    ShieldCheck,
    Settings,
    Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    isOpen: boolean;
    onClose?: () => void;
}

interface MenuItem {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    href: string;
    section?: string;
}

const menuItems: MenuItem[] = [
    {
        icon: LayoutDashboard,
        label: 'Dashboard',
        href: '/',
    },
    {
        icon: BarChart2,
        label: 'Metrics',
        href: '/metrics',
    },
    {
        icon: ShieldCheck,
        label: 'Compliance',
        href: '/compliance',
    },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const pathname = usePathname();
    const { user } = useAuth();

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-slate-900/80 border-r border-slate-800 backdrop-blur-xl overflow-y-auto z-40 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:static lg:z-0`}
            >
                <nav className="p-4 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                    ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                                    }`}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                <span className="font-medium">{item.label}</span>
                                {item.section && (
                                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${isActive ? 'bg-brand-primary/30 text-brand-primary' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {item.section}
                                    </span>
                                )}
                                {isActive && (
                                    <div className="ml-auto w-2 h-2 bg-brand-primary rounded-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-gradient-to-t from-slate-900 to-transparent">
                    <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg p-4">
                        <Shield className="w-5 h-5 text-brand-primary mb-2" />
                        <p className="text-sm font-medium text-white">{user?.tenant_name || 'Company Portal'}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Engineering Analytics & Compliance
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
};
