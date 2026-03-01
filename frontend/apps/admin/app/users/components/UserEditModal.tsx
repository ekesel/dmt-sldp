'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, User as UserIcon, Mail } from 'lucide-react';
import { users as usersApi } from '@dmt/api';
import { useAuth } from '../../auth/AuthContext';

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    user: any;
}

export function UserEditModal({ isOpen, onClose, onSuccess, user }: UserEditModalProps) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        role: 'Admin',
        is_active: true,
        custom_title: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user: currentUser } = useAuth();

    useEffect(() => {
        if (user) {
            let role = 'User';
            if (user.is_superuser) role = 'Super Admin';
            else if (user.is_platform_admin) role = 'Admin';
            else if (user.is_manager || user.is_staff) role = 'Manager';

            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                role: role,
                is_active: user.is_active ?? true,
                custom_title: user.custom_title || '',
            });
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Map UI role to backend flags
            const roleFlags = {
                is_platform_admin: formData.role === 'Super Admin' || formData.role === 'Admin',
                is_superuser: formData.role === 'Super Admin',
                is_staff: formData.role === 'Manager' || formData.role === 'Admin' || formData.role === 'Super Admin',
                is_manager: formData.role === 'Manager' || formData.role === 'Admin' || formData.role === 'Super Admin',
            };

            await usersApi.update(user.id, {
                first_name: formData.first_name,
                last_name: formData.last_name,
                is_active: formData.is_active,
                custom_title: formData.custom_title,
                ...roleFlags
            });
            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserIcon className="text-blue-400" size={20} />
                        Edit User
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Mail size={14} className="text-slate-500" />
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email (Read-only)</span>
                        </div>
                        <p className="text-white font-medium">{user.email}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                                placeholder="John"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Role</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition appearance-none font-['Inter']"
                            >
                                {currentUser?.is_superuser && <option value="Super Admin">Super Admin</option>}
                                {(currentUser?.is_superuser || currentUser?.is_platform_admin) && <option value="Admin">Admin</option>}
                                <option value="Manager">Manager</option>
                                <option value="User">User</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Custom Title (Winners Corner)</label>
                        <input
                            type="text"
                            name="custom_title"
                            value={formData.custom_title}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                            placeholder="e.g. Code Quality Champion"
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-800">
                        <input
                            type="checkbox"
                            id="is_active"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={handleChange}
                            className="w-4 h-4 rounded text-blue-500 bg-slate-800 border-slate-700 focus:ring-blue-500/40"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-slate-300 cursor-pointer">
                            Active Account
                        </label>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
