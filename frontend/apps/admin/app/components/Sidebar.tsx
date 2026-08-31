'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentTenant } from '../context/TenantContext';
import { useAuth } from '../auth/AuthContext';
import {
    LayoutDashboard,
    Building2,
    Settings,
    BarChart3,
    Users,
    Shield,
    ActivitySquare,
    FolderKanban,
    Target,
    Wrench,
    Layers,
} from 'lucide-react';

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
        icon: Layers,
        label: 'Resource Allocation',
        href: '/resource-allocation',
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
        icon: Target,
        label: 'Company Baseline',
        href: '/company-baseline',
    },
    {
        icon: Settings,
        label: 'Settings',
        href: '/settings',
    },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const pathname = usePathname();
    const { currentTenantId } = useCurrentTenant();
    const { user: currentUser } = useAuth();

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
            icon: Wrench,
            label: 'Methods',
            href: `/projects/${projectId}/sources`,
            section: 'Project'
        });
    }

    // Filter items based on role
    const allowedMenuItems = menuItems.filter(item => {
        if (item.label === 'Tenants') {
            return currentUser?.is_superuser;
        }
        return true;
    });

    const allItems = [...allowedMenuItems, ...dynamicItems];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-background/50 z-30 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-muted-foreground/10 border-r border-border backdrop-blur-xl overflow-y-auto z-40 transition-transform duration-300 lg:static lg:z-0 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <nav className="p-4 space-y-2">
                    {allItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.href === '/' 
                            ? pathname === '/' 
                            : pathname?.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                                    }`}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                <span className="font-medium">{item.label}</span>
                                {item.section && (
                                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                        }`}>
                                        {item.section}
                                    </span>
                                )}
                                {!item.section && isActive && (
                                    <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                
            </aside>
        </>
    );
};
