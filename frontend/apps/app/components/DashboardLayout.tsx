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
            let finalWsUrl: string;

            const buildWsBase = (host: string): string => {
                // Already a full WS URL
                if (host.startsWith('ws://') || host.startsWith('wss://')) return host.replace(/\/$/, '');
                const h = host.replace(/\/$/, '');
                const isLocal = h === 'localhost' || h === '127.0.0.1';
                return isLocal ? `ws://${h}:8000` : `wss://${h}`;
            };

            const wsBase = buildWsBase(
                process.env.NEXT_PUBLIC_WS_HOST ||
                `${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
            );
            finalWsUrl = `${wsBase}/ws/news/?token=${token}`;

            setWsUrl(finalWsUrl);
        } else {
            console.warn('[DashboardLayout] No auth token available, skipping Newsfeed WebSocket initialization');
            setWsUrl(null);
        }
    }, [token, isLoading]);

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
