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

            const role = user.is_superuser ? 'Super Admin' : user.is_platform_admin ? 'Admin' : user.is_manager ? 'Manager' : 'User';
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
        if (user.is_manager) return { label: 'Manager', color: 'text-emerald-400' };
        return { label: 'User', color: 'text-slate-400' };
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
                    <h1 className="text-3xl font-bold text-foreground mb-2 font-['Outfit']">
                        {currentTenant ? `${currentTenant.name} Users` : 'Platform Users'}
                    </h1>
                    <p className="text-muted-foreground">
                        {currentTenant
                            ? `Manage admin users and their permissions for ${currentTenant.name}.`
                            : 'Manage all admin users across the platform.'}
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Add User
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center bg-card/50 p-4 border border-border rounded-xl">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, email or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-muted-foreground" size={18} />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-muted border border-border text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    >
                        <option>All Roles</option>
                        <option>Super Admin</option>
                        <option>Admin</option>
                        <option>Manager</option>
                        <option>User</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-card/50 border border-border rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">User</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Role</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Title</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Joined</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-muted"></div>
                                                <div className="space-y-2">
                                                    <div className="h-4 w-32 bg-muted rounded"></div>
                                                    <div className="h-3 w-48 bg-muted rounded"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><div className="h-4 w-24 bg-muted rounded"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 w-16 bg-muted rounded-full"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 w-20 bg-muted rounded"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 w-8 bg-muted rounded-lg ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : paginatedUsers.length > 0 ? (
                                paginatedUsers.map((user) => {
                                    const role = getRoleInfo(user);
                                    return (
                                        <tr key={user.id} className="hover:bg-accent/30 transition group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold text-primary border border-primary/20">
                                                        {(user.first_name?.[0] || user.username[0]).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-foreground font-medium">
                                                            {user.first_name} {user.last_name || user.username}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-['Inter']">
                                                <div className="flex items-center gap-2 text-foreground">
                                                    <Shield className={`w-4 h-4 ${role.color}`} />
                                                    {role.label}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground font-medium">
                                                {user.custom_title || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge
                                                    label={user.is_active ? 'Active' : 'Inactive'}
                                                    variant={user.is_active ? 'success' : 'error'}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground text-sm">
                                                {formatDate(user.date_joined as string)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleInviteUser(user)}
                                                        className="p-2 hover:bg-muted rounded-lg transition text-muted-foreground hover:text-success"
                                                        title="Send password reset / invite"
                                                    >
                                                        <Mail size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-2 hover:bg-muted rounded-lg transition text-muted-foreground hover:text-primary"
                                                        title="Edit user"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setUserToDelete(user);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                        className="p-2 hover:bg-muted rounded-lg transition text-muted-foreground hover:text-destructive"
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
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-['Inter']">
                                        No users found {currentTenant ? 'for this tenant' : ''}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
                        <p className="text-sm text-muted-foreground font-['Inter']">
                            Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-foreground">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="text-foreground">{filteredUsers.length}</span> users
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-muted hover:bg-accent disabled:opacity-50 text-muted-foreground rounded-lg transition"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-muted hover:bg-accent disabled:opacity-50 text-muted-foreground rounded-lg transition"
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="bg-popover border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
                                <Trash2 size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-foreground">Delete User?</h3>
                                <p className="text-muted-foreground">
                                    Are you sure you want to delete <span className="text-foreground font-medium">{userToDelete.email}</span>? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-muted/50 flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2 bg-muted hover:bg-secondary text-foreground font-medium rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                className="flex-1 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium rounded-lg transition shadow-lg shadow-destructive/20 font-['Outfit']"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Link Modal */}
            {isInviteModalOpen && inviteLink && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="bg-popover border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 text-success mb-2">
                                <div className="p-2 bg-success/10 rounded-lg">
                                    <Mail size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-foreground">Invite Link Generated</h3>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                Copy the link below and send it to the user so they can set their password and log in. This link is single-use.
                            </p>
                            <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-lg mt-4">
                                <input
                                    type="text"
                                    readOnly
                                    value={inviteLink}
                                    className="bg-transparent flex-1 text-foreground outline-none text-sm"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(inviteLink);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="p-2 hover:bg-accent rounded-lg transition text-muted-foreground flex-shrink-0"
                                >
                                    {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                        <div className="p-4 bg-muted/30 flex justify-end">
                            <button
                                onClick={() => {
                                    setIsInviteModalOpen(false);
                                    setInviteLink(null);
                                    setCopied(false);
                                }}
                                className="px-4 py-2 bg-muted hover:bg-secondary text-foreground font-medium rounded-lg transition"
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
