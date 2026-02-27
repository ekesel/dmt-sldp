'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notifications as apiNotifications, Notification } from '@dmt/api';

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMounted = useRef(true);

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

        // Parse the WS URL from env to get the host
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        let wsHost = `${hostname}:8000`;
        const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;

        if (envWsUrl) {
            try {
                // If env var is a full URL, extract authority (host + port only)
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
            console.log('Notifications WebSocket Connected');
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
                }
            } catch (e) {
                console.error('Failed to parse notification message', e);
            }
        };

        ws.current.onclose = () => {
            setStatus('closed');
            console.log('Notifications WebSocket Disconnected');
            // Only schedule a reconnect if the component is still mounted
            if (!isMounted.current) return;
            reconnectTimer.current = setTimeout(connectWebSocket, 5000);
        };

        ws.current.onerror = (err) => {
            console.error('Notifications WebSocket Error', err);
            ws.current?.close();
        };
    }, []);

    useEffect(() => {
        isMounted.current = true;
        fetchNotifications();
        connectWebSocket();

        return () => {
            // Mark as unmounted first so the onclose handler won't schedule a reconnect
            isMounted.current = false;
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
                reconnectTimer.current = null;
            }
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
