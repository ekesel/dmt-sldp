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




            let wsHost = (process.env.NEXT_PUBLIC_WS_HOST || window.location.hostname).trim();
            
            // Standardize: remove existing protocol and trailing /ws or / to avoid duplicates
            wsHost = wsHost.replace(/^wss?:\/\//, '').replace(/\/+$/, '').replace(/\/ws$/, '');

            const isLocal = wsHost.includes('localhost') || wsHost.includes('127.0.0.1') || wsHost.includes('0.0.0.0');

            // Default to wss: for external hosts to avoid mixed content issues or connection failures
            let wsProtocol = 'wss:';
            if (isLocal && window.location.protocol !== 'https:') {
                wsProtocol = 'ws:';
            }

            if (isLocal) {
                // For local dev, we usually run on port 8000
                if (!wsHost.includes(':')) {
                    wsHost = `${wsHost}:8000`;
                }
            }

            // Construct final URL with correct /ws/news/ path and authentication token
            const finalWsUrl = `${wsProtocol}//${wsHost}/ws/news/?token=${token}`;
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
