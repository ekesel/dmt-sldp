'use client';

import React, { useState, useEffect } from 'react';
import { users as apiUsers, notifications as apiNotifications, User, DMTNotification } from '@dmt/api';
import { Send, User as UserIcon, Bell, Info, AlertTriangle, CheckCircle, XCircle, Search } from 'lucide-react';

export default function SendNotificationPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('info');
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await apiUsers.list();
                setUsers(data);
            } catch (err) {
                console.error('Failed to fetch users', err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.first_name && u.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.last_name && u.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !message) return;

        setSending(true);
        setStatus(null);
        try {
            await apiNotifications.send({
                recipient_id: selectedUser.id,
                title: title || 'Manual Notification',
                message: message,
                notification_type: type
            });
            setStatus({ type: 'success', message: `Notification sent to ${selectedUser.username}` });
            setTitle('');
            setMessage('');
            setSelectedUser(null);
            setSearchQuery('');
        } catch (err: any) {
            console.error('Failed to send notification', err);
            setStatus({ type: 'error', message: err.message || 'Failed to send notification' });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Bell className="w-8 h-8 text-brand-primary" />
                    Notification Center
                </h1>
                <p className="text-slate-400 mt-2">Send targeted in-app and browser notifications to other users.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Selection */}
                <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/80">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-primary transition"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {loading ? (
                            <div className="p-4 text-center text-slate-500 italic">Loading users...</div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 italic">No users found</div>
                        ) : (
                            filteredUsers.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => setSelectedUser(u)}
                                    className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition ${selectedUser?.id === u.id
                                        ? 'bg-brand-primary/20 border border-brand-primary/30'
                                        : 'hover:bg-slate-800 border border-transparent'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-brand-primary border border-slate-700">
                                        <UserIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">
                                            {u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Form */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    {selectedUser ? (
                        <form onSubmit={handleSend} className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-brand-primary/5 rounded-lg border border-brand-primary/10 mb-4">
                                <div className="p-2 bg-brand-primary/20 rounded-full">
                                    <UserIcon className="w-6 h-6 text-brand-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-brand-primary uppercase font-bold tracking-wider">Recipient</p>
                                    <p className="text-lg font-bold text-white">{selectedUser.first_name ? `${selectedUser.first_name} ${selectedUser.last_name || ''}` : selectedUser.username}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Notification Type</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { id: 'info', icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                                        { id: 'success', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                                        { id: 'warning', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                                        { id: 'error', icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-400/10' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setType(t.id)}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${type === t.id
                                                ? `bg-slate-800 border-slate-600 ring-2 ring-brand-primary/50`
                                                : `bg-slate-900 border-slate-800 hover:border-slate-700`
                                                }`}
                                        >
                                            <t.icon className={`w-6 h-6 ${t.color}`} />
                                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{t.id}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Notification Title</label>
                                <input
                                    type="text"
                                    placeholder="Brief summary..."
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-primary transition"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Message Content</label>
                                <textarea
                                    placeholder="Enter your message here..."
                                    rows={5}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-primary transition resize-none"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                />
                            </div>

                            {status && (
                                <div className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                                    {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
                                    <p className="text-sm font-medium">{status.message}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={sending || !message}
                                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {sending ? 'Sending...' : (
                                    <>
                                        <span>Dispatch Notification</span>
                                        <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition duration-300" />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 text-slate-500">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700">
                                <UserIcon className="w-10 h-10 opacity-20" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-300 mb-2">No Recipient Selected</h3>
                            <p className="max-w-xs mx-auto">Please select a user from the list on the left to start composing a notification.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
