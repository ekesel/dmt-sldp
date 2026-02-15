'use client';
import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ProtectedRoute } from '../auth/ProtectedRoute';

import { useSessionMonitor } from '../hooks/useSessionMonitor';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    useSessionMonitor(); // Initialize session monitoring

    return (
        <ProtectedRoute>
            <div className="flex flex-col h-screen bg-gray-50 dark:bg-brand-dark transition-colors duration-200">
                <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                <div className="flex flex-1 overflow-hidden">
                    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    <main className="flex-1 overflow-y-auto">
                        <div className="p-6 lg:p-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
};
