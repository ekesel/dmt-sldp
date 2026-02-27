'use client';

import React, { useState, useEffect, useRef } from 'react';
import { users as apiUsers, notifications as apiNotifications, User } from '@dmt/api';
import {
    Send,
    User as UserIcon,
    Bell,
    Info,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Search,
    Users,
} from 'lucide-react';

/* ── Custom checkbox ─────────────────────────────────────────── */
interface CheckboxProps {
    checked: boolean;
    indeterminate?: boolean;
    onChange: () => void;
    ariaLabel?: string;
    size?: 'sm' | 'md';
}

function Checkbox({ checked, indeterminate = false, onChange, ariaLabel, size = 'md' }: CheckboxProps) {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);

    const dim = size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]';

    return (
        <span className="relative flex-shrink-0" style={{ display: 'inline-flex' }}>
            {/* Hidden real input for a11y */}
            <input
                ref={ref}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                aria-label={ariaLabel}
                className="sr-only"
            />
            {/* Visual box */}
            <span
                onClick={onChange}
                aria-hidden="true"
                className={`
                    ${dim} flex items-center justify-center rounded-[5px] cursor-pointer
                    border transition-all duration-150
                    ${checked || indeterminate
                        ? 'bg-brand-primary border-brand-primary shadow-[0_0_0_3px_rgba(var(--color-brand-primary-rgb,99,102,241),0.18)]'
                        : 'bg-slate-800 border-slate-600 hover:border-brand-primary/60'
                    }
                `}
            >
                {/* Checkmark */}
                {checked && !indeterminate && (
                    <svg viewBox="0 0 10 8" fill="none" className="w-[9px] h-[7px]">
                        <path
                            d="M1 4l2.5 2.5L9 1"
                            stroke="white"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
                {/* Dash for indeterminate */}
                {indeterminate && (
                    <span className="w-[8px] h-[1.5px] rounded-full bg-white" />
                )}
            </span>
        </span>
    );
}

export default function SendNotificationPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    /** Set of selected user IDs (numeric) */
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('info');
    const [status, setStatus] = useState<{
        kind: 'success' | 'error' | 'partial';
        message: string;
    } | null>(null);

    // no longer needed — Checkbox component handles indeterminate internally

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

    const filteredUsers = users.filter(
        (u) =>
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.first_name && u.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.last_name && u.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    /* ── Select-all state (scoped to current filter) ── */
    const filteredIds = filteredUsers.map((u) => Number(u.id));
    const selectedFiltered = filteredIds.filter((id) => selectedIds.has(id));
    const allFilteredSelected =
        filteredIds.length > 0 && selectedFiltered.length === filteredIds.length;
    const someFilteredSelected =
        selectedFiltered.length > 0 && selectedFiltered.length < filteredIds.length;



    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            // Deselect all filtered users
            setSelectedIds((prev) => {
                const next = new Set(prev);
                filteredIds.forEach((id) => next.delete(id));
                return next;
            });
        } else {
            // Select all filtered users
            setSelectedIds((prev) => {
                const next = new Set(prev);
                filteredIds.forEach((id) => next.add(id));
                return next;
            });
        }
    };

    const toggleUser = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    /* ── Send ── */
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIds.size === 0 || !message) return;

        setSending(true);
        setStatus(null);
        try {
            const result = await apiNotifications.sendBulk({
                recipient_ids: [...selectedIds],
                title: title || 'Manual Notification',
                message,
                notification_type: type,
            });

            if (result.failed && result.failed.length > 0 && result.sent === 0) {
                setStatus({
                    kind: 'error',
                    message: `Failed to send to all ${result.failed.length} recipients.`,
                });
            } else if (result.failed && result.failed.length > 0) {
                setStatus({
                    kind: 'partial',
                    message: `Sent to ${result.sent} user${result.sent !== 1 ? 's' : ''}. ${result.failed.length} failed.`,
                });
            } else {
                setStatus({
                    kind: 'success',
                    message: `Notification sent to ${result.sent} user${result.sent !== 1 ? 's' : ''} successfully.`,
                });
                setTitle('');
                setMessage('');
                setSelectedIds(new Set());
                setSearchQuery('');
            }
        } catch (err: any) {
            console.error('Failed to send notification', err);
            setStatus({ kind: 'error', message: err.message || 'Failed to send notification' });
        } finally {
            setSending(false);
        }
    };

    /* ── Helpers ── */
    const displayName = (u: User) =>
        u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username;

    const recipientLabel = () => {
        if (selectedIds.size === 0) return null;
        if (selectedIds.size <= 3) {
            const names = users
                .filter((u) => selectedIds.has(Number(u.id)))
                .map(displayName)
                .join(', ');
            return names;
        }
        return `${selectedIds.size} users selected`;
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Bell className="w-8 h-8 text-brand-primary" />
                    Notification Center
                </h1>
                <p className="text-slate-400 mt-2">
                    Select one or more users and broadcast an in-app notification.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── User list panel ── */}
                <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[600px]">

                    {/* Search */}
                    <div className="p-4 border-b border-slate-800 bg-slate-900/80 space-y-3">
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

                        {/* Select-all row */}
                        {!loading && filteredUsers.length > 0 && (
                            <div className="flex items-center gap-3 px-1 select-none">
                                <Checkbox
                                    checked={allFilteredSelected}
                                    indeterminate={someFilteredSelected}
                                    onChange={toggleSelectAll}
                                    ariaLabel="Select all visible users"
                                />
                                <span
                                    onClick={toggleSelectAll}
                                    className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                                >
                                    {allFilteredSelected ? 'Deselect all' : 'Select all'}{' '}
                                    <span className="text-slate-600">({filteredUsers.length})</span>
                                </span>
                                {selectedIds.size > 0 && (
                                    <span className="ml-auto flex items-center gap-1 bg-brand-primary/20 text-brand-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        <Users className="w-3 h-3" />
                                        {selectedIds.size}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* User rows */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {loading ? (
                            <div className="p-4 text-center text-slate-500 italic">Loading users...</div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 italic">No users found</div>
                        ) : (
                            filteredUsers.map((u) => {
                                const uid = Number(u.id);
                                const selected = selectedIds.has(uid);
                                return (
                                    <div
                                        key={u.id}
                                        onClick={() => toggleUser(uid)}
                                        className={`w-full text-left p-3 rounded-lg flex items-center gap-3 cursor-pointer transition select-none ${selected
                                                ? 'bg-brand-primary/20 border border-brand-primary/30'
                                                : 'hover:bg-slate-800 border border-transparent'
                                            }`}
                                    >
                                        <Checkbox
                                            checked={selected}
                                            onChange={() => toggleUser(uid)}
                                            ariaLabel={`Select ${displayName(u)}`}
                                            size="sm"
                                        />
                                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-brand-primary border border-slate-700 flex-shrink-0">
                                            <UserIcon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">
                                                {displayName(u)}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── Compose panel ── */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    {selectedIds.size > 0 ? (
                        <form onSubmit={handleSend} className="space-y-6">
                            {/* Recipient badge */}
                            <div className="flex items-center gap-4 p-4 bg-brand-primary/5 rounded-lg border border-brand-primary/10">
                                <div className="p-2 bg-brand-primary/20 rounded-full">
                                    <Users className="w-6 h-6 text-brand-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-brand-primary uppercase font-bold tracking-wider">
                                        {selectedIds.size === 1 ? 'Recipient' : `Recipients (${selectedIds.size})`}
                                    </p>
                                    <p className="text-base font-bold text-white truncate">
                                        {recipientLabel()}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedIds(new Set())}
                                    className="ml-auto text-xs text-slate-500 hover:text-rose-400 transition"
                                    aria-label="Clear selection"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Notification type picker */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Notification Type
                                </label>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { id: 'info', icon: Info, color: 'text-blue-400' },
                                        { id: 'success', icon: CheckCircle, color: 'text-emerald-400' },
                                        { id: 'warning', icon: AlertTriangle, color: 'text-amber-400' },
                                        { id: 'error', icon: XCircle, color: 'text-rose-400' },
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setType(t.id)}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${type === t.id
                                                ? 'bg-slate-800 border-slate-600 ring-2 ring-brand-primary/50'
                                                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                                }`}
                                        >
                                            <t.icon className={`w-6 h-6 ${t.color}`} />
                                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                                                {t.id}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Notification Title
                                </label>
                                <input
                                    type="text"
                                    placeholder="Brief summary..."
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-primary transition"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Message Content
                                </label>
                                <textarea
                                    placeholder="Enter your message here..."
                                    rows={5}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-primary transition resize-none"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Status feedback */}
                            {status && (
                                <div
                                    className={`p-4 rounded-xl flex items-center gap-3 ${status.kind === 'success'
                                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                        : status.kind === 'partial'
                                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                            : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                                        }`}
                                >
                                    {status.kind === 'success' ? (
                                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                    ) : status.kind === 'partial' ? (
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                    ) : (
                                        <XCircle className="w-5 h-5 flex-shrink-0" />
                                    )}
                                    <p className="text-sm font-medium">{status.message}</p>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={sending || !message}
                                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {sending ? (
                                    'Sending...'
                                ) : (
                                    <>
                                        <span>
                                            Dispatch to {selectedIds.size} {selectedIds.size === 1 ? 'User' : 'Users'}
                                        </span>
                                        <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition duration-300" />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 text-slate-500">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700">
                                <Users className="w-10 h-10 opacity-20" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-300 mb-2">No Recipients Selected</h3>
                            <p className="max-w-xs mx-auto">
                                Check one or more users from the list on the left. Use{' '}
                                <span className="text-slate-300 font-medium">Select all</span> to target everyone at once.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
