'use client';
import React from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Users, Plus, Shield, MoreVertical } from 'lucide-react';
import { Badge } from '../components/UIComponents';

export default function UsersPage() {
    const mockUsers = [
        { id: '1', name: 'John Admin', email: 'john@example.com', role: 'Super Admin', status: 'Active', joined: '2024-01-15' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Admin', status: 'Active', joined: '2024-02-03' },
        { id: '3', name: 'Bob Manager', email: 'bob@example.com', role: 'Manager', status: 'Inactive', joined: '2024-02-10' },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Users</h1>
                        <p className="text-slate-400">Manage admin users and their permissions.</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition">
                        <Plus className="w-5 h-5" />
                        Add User
                    </button>
                </div>

                {/* Users Table */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">User</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Role</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Joined</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {mockUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-800/30 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/40 to-purple-600/40 flex items-center justify-center font-semibold text-purple-300">
                                                    {user.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{user.name}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Shield className="w-4 h-4 text-blue-400" />
                                                {user.role}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge 
                                                label={user.status} 
                                                variant={user.status === 'Active' ? 'success' : 'error'}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-sm">{user.joined}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end">
                                                <button className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-slate-300">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
