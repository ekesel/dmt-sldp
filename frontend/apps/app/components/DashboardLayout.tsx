'use client';
import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { WebSocketProvider } from '../context/WebSocketContext';


interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { token, user, isLoading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [wsUrl, setWsUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading) return;
        if (token) {




            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

            let wsHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.hostname;


            const isLocalhost = wsHost === 'localhost' || wsHost === '127.0.0.1';

            if (isLocalhost) {

                wsHost = `${wsHost}:8000`;
            } else if (!wsHost.includes(':') && window.location.port) {

                wsHost = `${wsHost}:${window.location.port}`;
            }

            if (!wsHost.startsWith('ws://') && !wsHost.startsWith('wss://')) {
                wsHost = `${wsProtocol}//${wsHost}`;
            }

            // Path must include tenant slug for proper routing in Django Channels
            const tenantSlug = user?.tenant_slug || localStorage.getItem('dmt-tenant') || 'default';
            const finalWsUrl = `${wsHost}/news/?token=${token}`;


            setWsUrl(finalWsUrl);
        } else {
            console.warn('[DashboardLayout] No auth token available, skipping Newsfeed WebSocket initialization');
            setWsUrl(null);
        }
    }, [token, isLoading]); // Still react to token from useAuth to trigger re-run

    const content = (
        <div className="flex flex-col h-screen bg-background transition-colors duration-200">
            <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} isMenuOpen={sidebarOpen} />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );

    return (
        <WebSocketProvider url={wsUrl}>
            {content}
        </WebSocketProvider>
    );
};
