'use client';
import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { WebSocketProvider } from '../context/WebSocketContext';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [wsUrl, setWsUrl] = useState<string | null>(null);

    useEffect(() => {
        // Construct WebSocket URL
        const tenant = localStorage.getItem('dmt-tenant') || 'samta';
        const token = localStorage.getItem('dmt-access-token');

        if (token) {
            const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            setWsUrl(`${protocol}//${tenant}.${host}/ws/news/?token=${token}`);
        }
    }, []);

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
