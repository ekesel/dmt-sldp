'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/AuthContext';
import { Menu, LogOut, Settings, User, Shield } from 'lucide-react';

interface NavbarProps {
    onMenuClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
    const router = useRouter();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/auth/login');
        } catch (err) {
            // Silently handle logout error
        }
    };

    return (
        <nav className="bg-slate-900/50 border-b border-slate-800 backdrop-blur-xl sticky top-0 z-40">
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
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    {/* User Info */}
                    <div className="hidden sm:flex flex-col items-end">
                        <p className="text-sm font-medium text-white">{user?.first_name || user?.username}</p>
                        <p className="text-xs text-slate-400">
                            {user?.is_superuser ? 'Super Admin' : 'Admin'}
                        </p>
                    </div>

                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                            {(user?.first_name?.[0] || user?.username?.[0] || 'A').toUpperCase()}
                        </span>
                    </div>

                    {/* Dropdown Menu */}
                    <div className="relative group">
                        <button className="p-2 hover:bg-slate-800 rounded-lg transition">
                            <svg className="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                            </svg>
                        </button>

                        {/* Dropdown Items */}
                        <div className="absolute right-0 mt-0 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
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
