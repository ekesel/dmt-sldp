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
        <nav className="bg-slate-900/95 border-b border-slate-800 backdrop-blur-xl sticky top-0 z-40 supports-[backdrop-filter]:bg-slate-900/50">
            <div className="px-6 py-4 flex items-center justify-between">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="p-2 hover:bg-slate-800 rounded-lg transition lg:hidden"
                    >
                        <Menu className="w-5 h-5 text-slate-300" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6 text-blue-500" />
                        <h1 className="text-lg font-bold text-white hidden sm:inline">DMT-SLDP</h1>
                    </div>

                    {/* Tenant Selector */}
                    <div className="hidden md:flex ml-4 pl-4 border-l border-slate-700 items-center">
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition text-sm font-medium text-slate-200">
                                <Building className="w-4 h-4 text-slate-400" />
                                <span>{currentTenant?.name || 'All Tenants (Global)'}</span>
                                <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:rotate-180" />
                            </button>

                            {/* Tenant Dropdown */}
                            <div className="absolute left-0 mt-2 w-60 bg-slate-900 border border-slate-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className="py-2">
                                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Switch Tenant
                                    </div>
                                    {isLoading ? (
                                        <div className="px-4 py-2 text-sm text-slate-500">Loading...</div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => !isGlobalDisabled && handleTenantSwitch('')}
                                                disabled={isGlobalDisabled}
                                                title={isGlobalDisabled ? 'Global view is not available for this page' : 'Switch to global view'}
                                                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between group/item transition ${!currentTenantId
                                                    ? 'text-blue-400 bg-slate-800/50'
                                                    : isGlobalDisabled
                                                        ? 'text-slate-600 cursor-not-allowed opacity-50'
                                                        : 'text-slate-300 hover:bg-slate-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>All Tenants (Global)</span>
                                                </div>
                                                {!currentTenantId && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                )}
                                            </button>
                                            <div className="border-t border-slate-800 my-1"></div>
                                            {availableTenants.length > 0 ? (
                                                availableTenants.map((tenant) => (
                                                    <button
                                                        key={tenant.id}
                                                        onClick={() => handleTenantSwitch(String(tenant.id))}
                                                        className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between group/item hover:bg-slate-800 transition ${String(tenant.id) === String(currentTenant?.id)
                                                            ? 'text-blue-400 bg-slate-800/50'
                                                            : 'text-slate-300'
                                                            }`}
                                                    >
                                                        <span>{tenant.name}</span>
                                                        {String(tenant.id) === String(currentTenant?.id) && (
                                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-sm text-slate-500">No tenants found</div>
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
                        <p className="text-sm font-medium text-white">{user?.first_name || user?.username}</p>
                        <p className="text-xs text-slate-400">
                            {user?.is_superuser ? 'Super Admin' : 'Admin'}
                        </p>
                    </div>

                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="text-white font-semibold text-sm">
                            {(user?.first_name?.[0] || user?.username?.[0] || 'A').toUpperCase()}
                        </span>
                    </div>

                    {/* Dropdown Menu */}
                    <div className="relative group">
                        <button className="p-2 hover:bg-slate-800 rounded-lg transition">
                            <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-200 transition" />
                        </button>

                        {/* Dropdown Items */}
                        <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <button className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2 rounded-t-lg transition">
                                <User className="w-4 h-4" />
                                My Profile
                            </button>
                            <button className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition">
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <hr className="border-slate-800" />
                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2 rounded-b-lg transition"
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
