'use client';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../auth/AuthContext';
import { useCurrentTenant } from '../context/TenantContext';
import { Menu, LogOut, Settings, User, Shield, ChevronDown, Building } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
    onMenuClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { currentTenantId, currentTenant, availableTenants, switchTenant, isLoading } = useCurrentTenant();

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/auth/login');
        } catch (err) {
            // Silently handle logout error
        }
    };

    const pathname = usePathname();

    // Determine if switching to "Global" is disabled for the current route
    const isGlobalDisabled = pathname?.includes('/projects') || pathname?.includes('/sources');

    const handleTenantSwitch = async (tenantId: string) => {
        await switchTenant(tenantId);

        // If we were on a tenant-specific page (/tenants/[id]/...), 
        // we should redirect appropriately.
        if (pathname?.includes('/tenants/')) {
            if (tenantId) {
                const newPathname = pathname.replace(/\/tenants\/[^/]+/, `/tenants/${tenantId}`);
                if (newPathname !== pathname) {
                    router.push(newPathname);
                }
            } else {
                // Moving from tenant view to global view
                // For users, we go to /users. For others, we go to dashboard /
                if (pathname.includes('/users')) {
                    router.push('/users');
                } else {
                    router.push('/');
                }
            }
        }
    };

    return (
        <nav className="bg-muted/95 border-b border-border backdrop-blur-xl sticky top-0 z-40 supports-[backdrop-filter]:bg-muted-foreground/20">
            <div className="px-6 py-4 flex items-center justify-between">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="p-2 hover:bg-accent rounded-lg transition lg:hidden"
                    >
                        <Menu className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" />
                        <h1 className="text-lg font-bold text-foreground hidden sm:inline">Elevate</h1>
                    </div>

                    {/* Tenant Selector */}
                    <div className="hidden md:flex ml-4 pl-4 border-l border-border items-center">
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent transition text-sm font-medium text-foreground">
                                <Building className="w-4 h-4 text-muted-foreground" />
                                <span>{currentTenant?.name || 'All Tenants (Global)'}</span>
                                <ChevronDown className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground transition-transform group-hover:rotate-180" />
                            </button>

                            {/* Tenant Dropdown */}
                            <div className="absolute left-0 mt-2 w-60 bg-popover border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className="py-2">
                                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Switch Tenant
                                    </div>
                                    {isLoading ? (
                                        <div className="px-4 py-2 text-sm text-muted-foreground">Loading...</div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => !isGlobalDisabled && handleTenantSwitch('')}
                                                disabled={isGlobalDisabled}
                                                title={isGlobalDisabled ? 'Global view is not available for this page' : 'Switch to global view'}
                                                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between group/item transition ${!currentTenantId
                                                    ? 'text-primary bg-accent/50'
                                                    : isGlobalDisabled
                                                        ? 'text-muted-foreground/40 cursor-not-allowed opacity-50'
                                                        : 'text-foreground hover:bg-accent'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>All Tenants (Global)</span>
                                                </div>
                                                {!currentTenantId && (
                                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                )}
                                            </button>
                                            <div className="border-t border-border my-1"></div>
                                            {availableTenants.length > 0 ? (
                                                availableTenants.map((tenant) => (
                                                    <button
                                                        key={tenant.id}
                                                        onClick={() => handleTenantSwitch(String(tenant.id))}
                                                        className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between group/item hover:bg-accent transition ${String(tenant.id) === String(currentTenant?.id)
                                                            ? 'text-primary bg-accent/50'
                                                            : 'text-foreground'
                                                            }`}
                                                    >
                                                        <span>{tenant.name}</span>
                                                        {String(tenant.id) === String(currentTenant?.id) && (
                                                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-sm text-muted-foreground">No tenants found</div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2">
                    <NotificationBell />

                    {/* User Profile */}
                    <div className="hidden sm:flex flex-col items-end">
                        <p className="text-sm font-medium text-foreground">{user?.first_name || user?.username}</p>
                        <p className="text-xs text-muted-foreground">
                            {user?.is_superuser ? 'Super Admin' : 'Admin'}
                        </p>
                    </div>

                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="text-primary-foreground font-semibold text-sm">
                            {(user?.first_name?.[0] || user?.username?.[0] || 'A').toUpperCase()}
                        </span>
                    </div>

                    {/* Dropdown Menu */}
                    <div className="relative group">
                        <button className="p-2 hover:bg-accent rounded-lg transition">
                            <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition" />
                        </button>

                        {/* Dropdown Items */}
                        <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <button
                                onClick={() => router.push('/profile')}
                                className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 rounded-t-lg transition"
                            >
                                <User className="w-4 h-4" />
                                My Profile
                            </button>
                            <button
                                onClick={() => router.push('/settings')}
                                className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 transition"
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <hr className="border-border" />
                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 rounded-b-lg transition"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};
