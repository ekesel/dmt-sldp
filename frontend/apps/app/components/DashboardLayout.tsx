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
            console.log('[DashboardLayout] Found auth token, initializing WebSocket...');

            // Using deployed backend as per latest instructions
            const finalWsUrl = `wss://api.elevate.samta.ai/ws/news/?token=${token}`;

            console.log(`[DashboardLayout] Connecting to Newsfeed WS: wss://api.elevate.samta.ai/ws/news/?token=***${token.slice(-6)}`);
            setWsUrl(finalWsUrl);
        } else {
            console.warn('[DashboardLayout] No auth token available, skipping Newsfeed WebSocket initialization');
            setWsUrl(null);
        }
    }, [token, isLoading]); // Still react to token from useAuth to trigger re-run

    const content = (
        <div className="flex flex-col h-screen bg-background transition-colors duration-200">
            <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
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
