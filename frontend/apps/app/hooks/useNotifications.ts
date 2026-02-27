'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notifications as apiNotifications, DMTNotification } from '@dmt/api';

export function useNotifications() {
    const [notifications, setNotifications] = useState<DMTNotification[]>([]);
    const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
    const ws = useRef<WebSocket | null>(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await apiNotifications.list();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, []);

    const connectWebSocket = useCallback(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('dmt-access-token') : null;
        if (!token) return;

        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        let wsHost = `${hostname}:8000`;
        const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;

        if (envWsUrl) {
            try {
                if (envWsUrl.includes('://')) {
                    const urlObj = new URL(envWsUrl);
                    wsHost = urlObj.host;
                } else {
                    wsHost = envWsUrl;
                }
            } catch (e) {
                console.warn('Failed to parse NEXT_PUBLIC_WS_URL', e);
            }
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${wsHost}/ws/notifications/?token=${token}`;

        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
            setStatus('open');
        };

        ws.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'notification') {
                    const newNotification = message.data;
                    setNotifications(prev => {
                        if (prev.some(n => n.id === newNotification.id)) {
                            return prev;
                        }
                        return [newNotification, ...prev];
                    });

                    // --- Browser Native Notification ---
                    if (typeof window !== 'undefined' && 'Notification' in window) {
                        if (Notification.permission === 'granted') {
                            new Notification(newNotification.title || 'DMT Notification', {
                                body: newNotification.message,
                                icon: '/favicon.ico', // Update with real icon path if available
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to parse notification message', e);
            }
        };

        ws.current.onclose = () => {
            setStatus('closed');
            setTimeout(connectWebSocket, 5000);
        };

        ws.current.onerror = (err) => {
            ws.current?.close();
        };
    }, []);

    useEffect(() => {
        // Request browser notification permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }

        fetchNotifications();
        connectWebSocket();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [fetchNotifications, connectWebSocket]);

    const markAsRead = async (id: string | number) => {
        try {
            await apiNotifications.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await apiNotifications.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    };

    return {
        notifications,
        unreadCount,
        status,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications
    };
}
