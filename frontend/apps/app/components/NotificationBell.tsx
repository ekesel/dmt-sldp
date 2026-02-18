'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white"
                title="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-slate-900">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" />
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2 opacity-20" />
                                <p className="text-sm text-slate-500">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/50">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`p-4 hover:bg-slate-800/50 transition relative group ${!n.is_read ? 'bg-blue-500/5' : ''}`}
                                        onClick={() => !n.is_read && markAsRead(n.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-0.5">{getIcon(n.notification_type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm leading-relaxed ${!n.is_read ? 'text-slate-200' : 'text-slate-400'}`}>
                                                    {n.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Clock className="w-3 h-3 text-slate-600" />
                                                    <span className="text-[10px] text-slate-600">
                                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {!n.is_read && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-slate-800/30 border-t border-slate-800 text-center">
                        <button className="text-xs text-slate-500 hover:text-slate-300 transition">
                            View all activities
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
