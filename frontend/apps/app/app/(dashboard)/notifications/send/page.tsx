'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { users as apiUsers, notifications as apiNotifications, User, DMTNotification } from '@dmt/api';
import { useWebSocket } from '../../../../hooks/useWebSocket';
import {
    Send,
    User as UserIcon,
    MessageSquare,
    Info,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Search,
    Users,
    Bell,
    ChevronRight,
    Check
} from 'lucide-react';

/* ── Notification Styles ─────────────────────────────────────── */
const NOTIFICATION_STYLES: Record<string, { icon: React.ReactNode; bg: string }> = {
    success: { icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50' },
    warning: { icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50' },
    error: { icon: <XCircle className="w-5 h-5 text-rose-500" />, bg: 'bg-rose-50' },
    info: { icon: <Info className="w-5 h-5 text-primary" />, bg: 'bg-blue-50' },
};

const getNotificationStyle = (type: string) => NOTIFICATION_STYLES[type] || NOTIFICATION_STYLES.info;

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
            <input
                ref={ref}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                aria-label={ariaLabel}
                className="sr-only"
            />
            <span
                onClick={onChange}
                aria-hidden="true"
                className={`
                    ${dim} flex items-center justify-center rounded-[5px] cursor-pointer
                    border transition-all duration-150
                    ${checked || indeterminate
                        ? 'bg-primary/90 border-primary ring-2 ring-primary/30'
                        : 'bg-white border-primary/30 hover:border-primary/80'
                    }
                `}
            >
                {checked && !indeterminate && (
                    <svg viewBox="0 0 10 8" fill="none" className="w-[9px] h-[7px]">
                        <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
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
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('info');
    const [status, setStatus] = useState<{
        kind: 'success' | 'error' | 'partial';
        message: string;
    } | null>(null);

    const [notifications, setNotifications] = useState<DMTNotification[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(true);
    const [highlightId, setHighlightId] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const { client: socket } = useWebSocket();

    useEffect(() => {
        if (!socket) return;

        const onNotification = (payload: any) => {
            const data = payload.data || payload;
            const manualTypes = ['info', 'success', 'warning', 'error'];
            
            if (manualTypes.includes(data.notification_type) && !data.data?.post_id) {
                setNotifications(prev => {
                    if (prev.some(n => n.id === data.id)) return prev;
                    return [data, ...prev];
                });
            }
        };

        socket.on('notification_message', onNotification);
        return () => {
            socket.off('notification_message', onNotification);
        };
    }, [socket]);

    useEffect(() => {
        const id = searchParams.get('notification_id');
        if (id && notifications.length > 0) {
            setHighlightId(String(id));
            const scrollTimer = setTimeout(() => {
                const el = document.getElementById(`notification-${id}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);

            const highlightTimer = setTimeout(() => {
                setHighlightId(null);
            }, 3000);

            return () => {
                clearTimeout(scrollTimer);
                clearTimeout(highlightTimer);
            };
        }
    }, [searchParams, notifications]);

    useEffect(() => {
        apiUsers.list()
            .then(setUsers)
            .catch(console.error)
            .finally(() => setLoading(false));

        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoadingNotifications(true);
        try {
            const data = await apiNotifications.list();
            const manualTypes = ['info', 'success', 'warning', 'error'];
            const manualMessages = data.filter(n => 
                manualTypes.includes(n.notification_type) && !n.data?.post_id
            );
            setNotifications(manualMessages);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        } finally {
            setLoadingNotifications(false);
        }
    };

    const filteredUsers = users.filter(
        (u) =>
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.first_name && u.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.last_name && u.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const filteredIds = filteredUsers.map((u) => Number(u.id));
    const selectedFiltered = filteredIds.filter((id) => selectedIds.has(id));
    const allFilteredSelected = filteredIds.length > 0 && selectedFiltered.length === filteredIds.length;
    const someFilteredSelected = selectedFiltered.length > 0 && selectedFiltered.length < filteredIds.length;

    const toggleSelectAll = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allFilteredSelected) {
                filteredIds.forEach((id) => next.delete(id));
            } else {
                filteredIds.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    const toggleUser = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

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
                setStatus({ kind: 'error', message: `Failed to send to all ${result.failed.length} recipients.` });
            } else if (result.failed && result.failed.length > 0) {
                setStatus({ kind: 'partial', message: `Sent to ${result.sent} user${result.sent !== 1 ? 's' : ''}. ${result.failed.length} failed.` });
            } else {
                setStatus({ kind: 'success', message: `Notification sent to ${result.sent} user${result.sent !== 1 ? 's' : ''} successfully.` });
                setTitle('');
                setMessage('');
                setSelectedIds(new Set());
                setSearchQuery('');
            }
        } catch (err: any) {
            setStatus({ kind: 'error', message: err.message || 'Failed to send notification' });
        } finally {
            setSending(false);
        }
    };

    const displayName = (u: User) =>
        u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username;

    const recipientLabel = () => {
        if (selectedIds.size === 0) return null;
        if (selectedIds.size <= 3) {
            return users.filter((u) => selectedIds.has(Number(u.id))).map(displayName).join(', ');
        }
        return `${selectedIds.size} users selected`;
    };

    return (
        <div className="min-h-screen bg-[#F3F4F6] p-8">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <header className="mb-8 bg-white rounded-2xl border border-primary/20 shadow-sm px-8 py-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/90 flex items-center justify-center shadow-md shadow-primary/30">
                        <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Quick Updates</h1>
                        <p className="text-primary-dark text-sm font-medium mt-0.5">Send updates to your team members</p>
                    </div>
                    {selectedIds.size > 0 && (
                        <div className="ml-auto flex items-center gap-2 bg-primary/20 text-primary-dark text-sm font-bold px-4 py-2 rounded-full">
                            <Users className="w-4 h-4" />
                            {selectedIds.size} selected
                        </div>
                    )}
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── User list panel ── */}
                    <div className="lg:col-span-1 bg-white border border-primary/20 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[770px]">

                        {/* Panel header */}
                        <div className="px-4 py-3 bg-primary/90 flex items-center gap-2">
                            <Users className="w-4 h-4 text-white/80" />
                            <span className="text-white font-semibold text-sm">Team Members</span>
                            {!loading && (
                                <span className="ml-auto text-white/70 text-xs">{filteredUsers.length} users</span>
                            )}
                        </div>

                        {/* Search */}
                        <div className="p-3 border-b border-gray-200 bg-white space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/80" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

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
                                        className="text-xs font-semibold text-primary-dark hover:text-primary-dark transition cursor-pointer"
                                    >
                                        {allFilteredSelected ? 'Deselect all' : 'Select all'}
                                        <span className="text-primary/80 ml-1">({filteredUsers.length})</span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* User rows */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {loading ? (
                                <div className="p-6 text-center text-primary/80 text-sm">Loading users...</div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="p-6 text-center text-primary/80 text-sm">No users found</div>
                            ) : (
                                filteredUsers.map((u) => {
                                    const uid = Number(u.id);
                                    const selected = selectedIds.has(uid);
                                    return (
                                        <div
                                            key={u.id}
                                            onClick={() => toggleUser(uid)}
                                            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 cursor-pointer transition select-none ${selected
                                                ? 'bg-gray-100 border border-gray-300 shadow-sm'
                                                : 'hover:bg-gray-100 border border-transparent'
                                                }`}
                                        >
                                            <Checkbox
                                                checked={selected}
                                                onChange={() => toggleUser(uid)}
                                                ariaLabel={`Select ${displayName(u)}`}
                                                size="sm"
                                            />
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition ${selected ? 'bg-primary/90 border-primary/80' : 'bg-gray-100 border-gray-200'
                                                }`}>
                                                <UserIcon className={`w-4 h-4 ${selected ? 'text-white' : 'text-primary'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{displayName(u)}</p>
                                                <p className="text-xs text-accent truncate">{u.email}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* ── Right side panels ── */}
                    <div className="lg:col-span-2 flex flex-col gap-6 h-[770px]">

                        {/* ── Compose panel ── */}
                        <div className="bg-white border border-primary/20 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">

                            {/* Panel header */}
                            <div className="px-6 py-3 bg-primary/90 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-white/80" />
                                <span className="text-white font-semibold text-sm">Compose Message</span>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                {selectedIds.size > 0 ? (
                                    <form onSubmit={handleSend} className="space-y-5 h-full flex flex-col">

                                        {/* Recipient badge */}
                                        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
                                            <div className="p-2 bg-primary/90 rounded-full shadow shadow-primary/30">
                                                <Users className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-primary uppercase font-bold tracking-wider">
                                                    {selectedIds.size === 1 ? 'Recipient' : `Recipients (${selectedIds.size})`}
                                                </p>
                                                <p className="text-sm font-bold text-gray-800 truncate">{recipientLabel()}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedIds(new Set())}
                                                className="ml-auto text-xs text-primary/80 hover:text-rose-500 transition font-medium"
                                            >
                                                Clear
                                            </button>
                                        </div>

                                        {/* Notification type picker */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                Notification Type
                                            </label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { id: 'info', icon: Info, color: 'text-primary', bg: 'bg-white border-gray-200', ring: 'ring-gray-200' },
                                                    { id: 'success', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200', ring: 'ring-emerald-300' },
                                                    { id: 'warning', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', ring: 'ring-amber-300' },
                                                    { id: 'error', icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200', ring: 'ring-rose-300' },
                                                ].map((t) => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => setType(t.id)}
                                                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${type === t.id
                                                            ? `${t.bg} ring-2 ${t.ring} shadow-sm`
                                                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <t.icon className={`w-5 h-5 ${t.color}`} />
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">{t.id}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                Title
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Brief summary..."
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                            />
                                        </div>

                                        {/* Message */}
                                        <div className="flex-1 flex flex-col">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                Message
                                            </label>
                                            <textarea
                                                placeholder="Type your message here..."
                                                rows={5}
                                                className="flex-1 w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition resize-none"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                required
                                            />
                                        </div>

                                        {/* Status feedback */}
                                        {status && (
                                            <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${status.kind === 'success'
                                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                                : status.kind === 'partial'
                                                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                                                }`}>
                                                {status.kind === 'success' ? (
                                                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                                ) : status.kind === 'partial' ? (
                                                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 flex-shrink-0" />
                                                )}
                                                {status.message}
                                            </div>
                                        )}

                                        {/* Send button */}
                                        <button
                                            type="submit"
                                            disabled={sending || !message}
                                            className="w-full bg-primary/90 hover:bg-primary-dark active:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-md shadow-primary/30 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                                        >
                                            {sending ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                                    Sending...
                                                </span>
                                            ) : (
                                                <>
                                                    <span>Send to {selectedIds.size} {selectedIds.size === 1 ? 'User' : 'Users'}</span>
                                                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform duration-200" />
                                                </>
                                            )}
                                        </button>
                                        <div className="h-2 shrink-0"></div>
                                    </form>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-5 border-2 border-gray-200">
                                            <MessageSquare className="w-9 h-9 text-gray-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-700 mb-2">No Recipients Yet</h3>
                                        <p className="text-accent text-sm max-w-xs">
                                            Select one or more team members from the list on the left to start composing your message.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Received Notifications panel ── */}
                        <div className="bg-white border border-primary/20 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[250px] max-h-[375px]">
                            {/* Panel header */}
                            <div className="px-6 py-3 bg-primary/90 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-white/80" />
                                    <span className="text-white font-semibold text-sm">Received Messages</span>
                                </div>
                                {notifications.filter(n => !n.is_read).length > 0 && (
                                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {notifications.filter(n => !n.is_read).length} New
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {loadingNotifications ? (
                                    <div className="p-8 flex items-center justify-center">
                                        <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">
                                        No notifications yet.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {notifications.map((n) => {
                                            const style = getNotificationStyle(n.notification_type);

                                            return (
                                                <div
                                                    key={n.id}
                                                    id={`notification-${n.id}`}
                                                    className={`p-4 flex items-start gap-4 transition-all duration-1000 relative ${highlightId === String(n.id) ? 'bg-accent/20 ring-2 ring-accent shadow-md rounded-xl z-10 m-1' : 'hover:bg-gray-50'}`}
                                                >
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${style.bg}`}>
                                                        {n.data?.sender_name ? <UserIcon className="w-5 h-5 text-primary" /> : style.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between mb-1.5 gap-4">
                                                            <h4 className="text-sm font-bold text-gray-900 break-words">
                                                                {n.data?.sender_name || n.title || 'System'}
                                                            </h4>
                                                            <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
                                                                {new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-[13.5px] text-gray-600 break-words whitespace-pre-wrap leading-relaxed">{n.message}</p>
                                                    </div>
                                                    {!n.is_read && (
                                                        <div className="shrink-0 pt-2">
                                                            <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>


                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
