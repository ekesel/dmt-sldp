'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCurrentTenant } from '../context/TenantContext';
import {
    LayoutDashboard,
    Building2,
    Settings,
    BarChart3,
    Users,
    Shield,
    ActivitySquare,
    FolderKanban,
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose?: () => void;
}

interface MenuItem {
    icon: any;
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
        icon: Building2,
        label: 'Tenants',
        href: '/tenants',
    },
    {
        icon: Users,
        label: 'Users',
        href: '/users',
    },
    {
        icon: BarChart3,
        label: 'Analytics',
        href: '/analytics',
    },
    {
        icon: ActivitySquare,
        label: 'System Status',
        href: '/system-status',
    },
    {
        icon: Shield,
        label: 'Activity',
        href: '/activity',
    },
    {
        icon: Settings,
        label: 'Settings',
        href: '/settings',
    },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const pathname = usePathname();
    const router = useRouter();
    const { currentTenantId } = useCurrentTenant();

    // Debugging Sidebar
    console.log('Sidebar Pathname:', pathname);
    console.log('Current Tenant ID (Context):', currentTenantId);

    // Dynamic Navigation Logic
    const tenantMatch = pathname?.match(/\/tenants\/([^\/]+)/);
    const urlTenantId = tenantMatch ? tenantMatch[1] : null;

    // Determine active tenant ID: URL context takes priority, fallback to context
    const activeTenantId = (urlTenantId && urlTenantId !== 'new') ? urlTenantId : currentTenantId;

    // Check if we are actually on a tenant-specific page
    const isOnTenantPage = !!urlTenantId && urlTenantId !== 'new';

    const projectMatch = pathname?.match(/\/projects\/([^\/]+)/);
    const projectId = projectMatch ? projectMatch[1] : null;

    const dynamicItems = [];

    // If we have an active tenant, add "Projects" link
    if (activeTenantId && activeTenantId !== 'new') {
        dynamicItems.push({
            icon: FolderKanban,
            label: 'Projects',
            href: `/tenants/${activeTenantId}/projects`,
            section: 'Tenant'
        });
    }

    // If inside a project context, add "Methods" (Sources) link
    if (projectId) {
        // We might want to link back to the parent tenant projects too, but for now just add Sources
        dynamicItems.push({
            icon: Settings,
            label: 'Methods',
            href: `/projects/${projectId}/sources`,
            section: 'Project'
        });
    }

    const allItems = [...menuItems, ...dynamicItems];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-slate-900/80 border-r border-slate-800 backdrop-blur-xl overflow-y-auto z-40 transition-transform duration-300 lg:static lg:z-0 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <nav className="p-4 space-y-2">
                    {allItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname === item.href + '/';

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                                    }`}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                <span className="font-medium">{item.label}</span>
                                {item.section && (
                                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${isActive ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {item.section}
                                    </span>
                                )}
                                {!item.section && isActive && (
                                    <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-gradient-to-t from-slate-900 to-transparent">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <Shield className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-sm font-medium text-white">Admin Portal</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Manage platform tenants and configurations
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
};
