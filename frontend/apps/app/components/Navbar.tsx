'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Menu, LogOut, User, ChevronDown } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
    onMenuClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error('Logout failed', err);
        } finally {
            router.push('/auth/login');
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
                        <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-brand-primary/20">
                            D
                        </div>
                        <h1 className="text-lg font-bold text-white hidden sm:inline tracking-tight">{user?.tenant_name || 'Company Portal'}</h1>
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2">
                    <NotificationBell />

                    {/* User Profile */}
                    <div className="hidden sm:flex flex-col items-end">
                        <p className="text-sm font-medium text-white">{user?.first_name || user?.username || 'Guest'}</p>
                        <p className="text-xs text-slate-400">
                            Company User
                        </p>
                    </div>

                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary to-blue-600 flex items-center justify-center shadow-lg shadow-brand-primary/20">
                        <span className="text-white font-semibold text-sm">
                            {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                        </span>
                    </div>

                    {/* Dropdown Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="p-2 hover:bg-slate-800 rounded-lg transition"
                        >
                            <ChevronDown className={`w-5 h-5 text-slate-400 transition ${isDropdownOpen ? 'rotate-180 text-slate-200' : 'group-hover:text-slate-200'}`} />
                        </button>

                        {/* Dropdown Items */}
                        <div className={`absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl transition-all duration-200 z-[100] ${isDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                            <button
                                onClick={() => { setIsDropdownOpen(false); router.push('/profile'); }}
                                className="w-full px-4 py-3 text-left text-sm bg-transparent !text-white hover:bg-slate-700 flex items-center gap-2 rounded-t-lg transition" style={{ color: 'white' }}>
                                <User className="w-4 h-4" />
                                <span style={{ color: 'white' }}>My Profile</span>
                            </button>
                            <hr className="border-slate-700" />
                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-3 text-left text-sm bg-transparent text-red-400 hover:bg-red-900/20 flex items-center gap-2 rounded-b-lg transition"
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
