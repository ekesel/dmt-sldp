'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, User as UserIcon, Mail, Briefcase, BarChart2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { users as usersApi, orgChart, User, UpdateUserPayload } from '@dmt/api';
import { useAuth } from '../../auth/AuthContext';

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    user: User;
}

/**
 * Modal dialog card for editing user details in the Admin Portal.
 */
export function UserEditModal({ isOpen, onClose, onSuccess, user }: UserEditModalProps) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        role: 'Admin',
        designation: '' as string | number,
        is_active: true,
        custom_title: '',
        seniority: '' as string,
        seniority_effective_from: '' as string,
    });
    const rawEffectiveFrom = typeof user?.seniority_effective_from === 'string' ? user.seniority_effective_from : '';
    const [lastEffectiveFrom, setLastEffectiveFrom] = useState<string>(rawEffectiveFrom);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orgRoles, setOrgRoles] = useState<{id: number | string, role_name?: string}[]>([]);
    const { user: currentUser } = useAuth();

    // Per api-contract: hide seniority on the editor's own profile
    const isOwnProfile = currentUser?.id === user?.id;

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await orgChart.getRolesDropdown();
                if (res.status && res.data) {
                    setOrgRoles(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch roles", err);
            }
        };
        fetchRoles();
    }, []);

    useEffect(() => {
        if (!isOpen || !user?.id || isOwnProfile) return;
        let isMounted = true;
        setLoadingHistory(true);

        const fetchHistory = async () => {
            try {
                const history = await usersApi.getSeniorityHistory(user.id);
                if (isMounted && Array.isArray(history) && history.length > 0) {
                    const lastEntry = history[history.length - 1];
                    if (lastEntry?.effective_from && typeof lastEntry.effective_from === 'string') {
                        const historyDate = lastEntry.effective_from;
                        setLastEffectiveFrom(historyDate);
                        setFormData(prev => {
                            const userDate = typeof user.seniority_effective_from === 'string' ? user.seniority_effective_from : '';
                            if (!prev.seniority_effective_from || prev.seniority_effective_from === userDate) {
                                return { ...prev, seniority_effective_from: historyDate };
                            }
                            return prev;
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to fetch seniority history", err);
            } finally {
                if (isMounted) {
                    setLoadingHistory(false);
                }
            }
        };

        fetchHistory();

        return () => {
            isMounted = false;
        };
    }, [isOpen, user?.id, isOwnProfile, user?.seniority_effective_from]);

    useEffect(() => {
        if (user) {
            let role = 'User';
            if (user.is_superuser) role = 'Super Admin';
            else if (user.is_platform_admin) role = 'Admin';
            else if (user.is_manager || user.is_staff) role = 'Manager';

            let designationValue: string | number = '';
            if (user.role !== undefined && user.role !== null) {
                if (typeof user.role === 'object') {
                    const roleObj = user.role as { id?: number | string };
                    designationValue = roleObj.id !== undefined ? roleObj.id : '';
                } else {
                    designationValue = user.role;
                }
            }

            const initialEffectiveDate = typeof user.seniority_effective_from === 'string' ? user.seniority_effective_from : '';
            setLastEffectiveFrom(initialEffectiveDate);

            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                role: role,
                designation: designationValue,
                is_active: user.is_active ?? true,
                custom_title: user.custom_title || '',
                seniority: user.seniority || '',
                seniority_effective_from: initialEffectiveDate,
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
                is_manager: formData.role === 'Manager',
            };

            const updatePayload: UpdateUserPayload = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                is_active: formData.is_active,
                role: formData.designation ? Number(formData.designation) : null,
                custom_title: formData.custom_title,
                ...roleFlags,
            };
            // Seniority and Effective From (hidden on own profile per api-contract)
            if (!isOwnProfile) {
                if (!formData.seniority_effective_from) {
                    const validationMsg = 'Effective From date is required';
                    setError(validationMsg);
                    toast.error(validationMsg);
                    setLoading(false);
                    return;
                }
                updatePayload.seniority = formData.seniority || null;
                updatePayload.seniority_effective_from = formData.seniority_effective_from;
            }
            await usersApi.update(user.id, updatePayload);
            toast.success('User details updated successfully');
            onSuccess?.();
            onClose();
        } catch (err: unknown) {
            const errorMessage = extractErrorMessage(err, 'Failed to update user');
            setError(errorMessage);
            toast.error(errorMessage);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="bg-popover border border-border rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <UserIcon className="text-primary" size={20} />
                        Edit User
                    </h2>
                    <button 
                        onClick={onClose} 
                        aria-label="Close"
                        className="p-2 hover:bg-accent rounded-lg transition text-muted-foreground hover:text-foreground"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <div className="p-3 bg-muted/50 rounded-lg border border-border mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Mail size={14} className="text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email (Read-only)</span>
                        </div>
                        <p className="text-foreground font-medium">{user.email}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1.5">First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                                placeholder="John"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Role</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition appearance-none font-['Inter']"
                            >
                                {currentUser?.is_superuser && <option value="Super Admin">Super Admin</option>}
                                {(currentUser?.is_superuser || currentUser?.is_platform_admin) && <option value="Admin">Admin</option>}
                                <option value="Manager">Manager</option>
                                <option value="User">User</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Designation</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <select
                                name="designation"
                                value={formData.designation}
                                onChange={handleChange}
                                className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition appearance-none"
                            >
                                <option value="">Select a designation...</option>
                                {orgRoles.map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.role_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Custom Title (Winners Corner)</label>
                        <input
                            type="text"
                            name="custom_title"
                            value={formData.custom_title}
                            onChange={handleChange}
                            className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                            placeholder="e.g. Code Quality Champion"
                        />
                    </div>

                    {/* Seniority Level - hidden when editing own profile */}
                    {!isOwnProfile && (
                        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart2 size={14} className="text-primary" />
                                <span className="text-sm font-medium text-foreground">Developer Level</span>
                                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">Affects workload capacity</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Level</label>
                                    <select
                                        name="seniority"
                                        value={formData.seniority}
                                        onChange={handleChange}
                                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition appearance-none text-sm"
                                    >
                                        <option value="">Not set (Mid)</option>
                                        <option value="junior">Junior</option>
                                        <option value="mid">Mid</option>
                                        <option value="senior">Senior</option>
                                    </select>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-xs font-medium text-muted-foreground">
                                            Effective From <span className="text-destructive">*</span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {lastEffectiveFrom && formData.seniority_effective_from !== lastEffectiveFrom && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, seniority_effective_from: lastEffectiveFrom }))}
                                                    className="text-[10px] text-muted-foreground hover:text-primary hover:underline font-medium"
                                                    title="Reset to last effective date"
                                                >
                                                    Last Date
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, seniority_effective_from: new Date().toLocaleDateString('en-CA') }))}
                                                className="text-[10px] text-primary hover:underline font-medium"
                                            >
                                                Today
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="date"
                                        name="seniority_effective_from"
                                        required
                                        value={formData.seniority_effective_from}
                                        onChange={handleChange}
                                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition text-sm"
                                    />
                                    {loadingHistory ? (
                                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin inline-block"></span>
                                            Loading last effective date...
                                        </p>
                                    ) : lastEffectiveFrom ? (
                                        <p className="text-[11px] text-muted-foreground mt-1">
                                            Last Effective Date: <span className="text-foreground font-medium">{formatDate(lastEffectiveFrom)}</span>
                                        </p>
                                    ) : (
                                        <p className="text-[11px] text-muted-foreground mt-1">
                                            No previous effective date set
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                        <input
                            type="checkbox"
                            id="is_active"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={handleChange}
                            className="w-4 h-4 rounded text-primary bg-muted border-border focus:ring-primary/40"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-foreground cursor-pointer">
                            Active Account
                        </label>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-muted hover:bg-secondary text-foreground font-medium rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
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

/**
 * Extracts a user-friendly error message from an unknown error object.
 */
function extractErrorMessage(err: unknown, fallbackMessage: string): string {
    if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: unknown } }).response;
        if (response?.data) {
            const data = response.data;
            if (typeof data === 'string') {
                return data;
            }
            if (typeof data === 'object' && data !== null) {
                const dataObj = data as Record<string, unknown>;
                if (typeof dataObj.message === 'string') {
                    return dataObj.message;
                }
                if (typeof dataObj.detail === 'string') {
                    return dataObj.detail;
                }
                if (typeof dataObj.error === 'string') {
                    return dataObj.error;
                }
                const firstKey = Object.keys(dataObj)[0];
                if (firstKey) {
                    const firstVal = dataObj[firstKey];
                    if (Array.isArray(firstVal) && firstVal.length > 0) {
                        return `${firstKey}: ${String(firstVal[0])}`;
                    }
                    if (typeof firstVal === 'string') {
                        return `${firstKey}: ${firstVal}`;
                    }
                }
            }
        }
    }
    if (err instanceof Error) {
        return err.message;
    }
    return fallbackMessage;
}

/**
 * Formats a YYYY-MM-DD date string into a user-friendly display date.
 */
function formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const date = new Date(year, month, day);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        }
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return dateString;
    }
}
