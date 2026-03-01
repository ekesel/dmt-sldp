'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Plus, Shield, Search, Filter, ChevronLeft, ChevronRight, Edit2, Trash2, Mail, Copy, Check } from 'lucide-react';
import { Badge } from '../../components/UIComponents';
import { users as usersApi, User } from '@dmt/api';
import { UserCreateModal } from './UserCreateModal';
import { UserEditModal } from './UserEditModal';
import { useCurrentTenant } from '../../context/TenantContext';

export function UserList() {
    const { currentTenantId, currentTenant } = useCurrentTenant();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All Roles');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Pass currentTenantId if it exists (for context-aware filtering)
            const filters = currentTenantId ? { tenant_id: currentTenantId } : {};
            const data = await usersApi.list(filters as any);
            setUsers(data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    }, [currentTenantId]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Filtering and Searching
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch =
                user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase());

            const role = user.is_superuser ? 'Super Admin' : user.is_platform_admin ? 'Admin' : 'Manager';
            const matchesRole = roleFilter === 'All Roles' || role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, roleFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await usersApi.delete(userToDelete.id);
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            fetchUsers();
        } catch (err: any) {
            alert(err.message || 'Failed to delete user');
        }
    };

    const handleInviteUser = async (user: User) => {
        try {
            const res = await usersApi.invite(user.id);
            setInviteLink(res.invite_link);
            setIsInviteModalOpen(true);
        } catch (err: any) {
            alert(err.response?.data?.error || err.message || 'Failed to invite user');
        }
    };

    const getRoleInfo = (user: User) => {
        if (user.is_superuser) return { label: 'Super Admin', color: 'text-purple-400' };
        if (user.is_platform_admin) return { label: 'Admin', color: 'text-blue-400' };
        return { label: 'Manager', color: 'text-emerald-400' };
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 font-['Outfit']">
                        {currentTenant ? `${currentTenant.name} Users` : 'Platform Users'}
                    </h1>
                    <p className="text-slate-400">
                        {currentTenant
                            ? `Manage admin users and their permissions for ${currentTenant.name}.`
                            : 'Manage all admin users across the platform.'}
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Add User
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center bg-slate-900/50 p-4 border border-slate-800 rounded-xl">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, email or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-slate-500" size={18} />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                    >
                        <option>All Roles</option>
                        <option>Super Admin</option>
                        <option>Admin</option>
                        <option>Manager</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">User</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Role</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Title</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Joined</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-800"></div>
                                                <div className="space-y-2">
                                                    <div className="h-4 w-32 bg-slate-800 rounded"></div>
                                                    <div className="h-3 w-48 bg-slate-800 rounded"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-800 rounded"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-800 rounded-full"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-800 rounded"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 w-8 bg-slate-800 rounded-lg ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : paginatedUsers.length > 0 ? (
                                paginatedUsers.map((user) => {
                                    const role = getRoleInfo(user);
                                    return (
                                        <tr key={user.id} className="hover:bg-slate-800/30 transition group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center font-bold text-blue-400 border border-blue-500/20">
                                                        {(user.first_name?.[0] || user.username[0]).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">
                                                            {user.first_name} {user.last_name || user.username}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-['Inter']">
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <Shield className={`w-4 h-4 ${role.color}`} />
                                                    {role.label}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400 font-medium">
                                                {user.custom_title || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge
                                                    label={user.is_active ? 'Active' : 'Inactive'}
                                                    variant={user.is_active ? 'success' : 'error'}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-sm">
                                                {formatDate(user.date_joined as string)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleInviteUser(user)}
                                                        className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-green-400"
                                                        title="Send password reset / invite"
                                                    >
                                                        <Mail size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-blue-400"
                                                        title="Edit user"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setUserToDelete(user);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                        className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-red-400"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-['Inter']">
                                        No users found {currentTenant ? 'for this tenant' : ''}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-800 flex items-center justify-between">
                        <p className="text-sm text-slate-500 font-['Inter']">
                            Showing <span className="text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-300">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="text-slate-300">{filteredUsers.length}</span> users
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 rounded-lg transition"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 rounded-lg transition"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <UserCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchUsers}
                tenantId={currentTenantId}
            />
            {selectedUser && (
                <UserEditModal
                    isOpen={isEditModalOpen}
                    user={selectedUser}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedUser(null);
                    }}
                    onSuccess={fetchUsers}
                />
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && userToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                                <Trash2 size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Delete User?</h3>
                                <p className="text-slate-400">
                                    Are you sure you want to delete <span className="text-white font-medium">{userToDelete.email}</span>? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-800/50 flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition shadow-lg shadow-red-500/20 font-['Outfit']"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Link Modal */}
            {isInviteModalOpen && inviteLink && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 text-green-400 mb-2">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <Mail size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Invite Link Generated</h3>
                            </div>
                            <p className="text-slate-400 text-sm">
                                Copy the link below and send it to the user so they can set their password and log in. This link is single-use.
                            </p>
                            <div className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-lg mt-4">
                                <input
                                    type="text"
                                    readOnly
                                    value={inviteLink}
                                    className="bg-transparent flex-1 text-slate-300 outline-none text-sm"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(inviteLink);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 flex-shrink-0"
                                >
                                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-800/30 flex justify-end">
                            <button
                                onClick={() => {
                                    setIsInviteModalOpen(false);
                                    setInviteLink(null);
                                    setCopied(false);
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
