import React from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import QueryProvider from '../components/providers/QueryProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Elevate',
    description: 'Engineering Analytics & Compliance',
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} min-h-screen bg-background text-foreground`} suppressHydrationWarning>
                <QueryProvider>
                    <AuthProvider>
                        {children}
                        <Toaster position="bottom-right" toastOptions={{
                            className: 'bg-popover text-foreground border border-border',
                            duration: 5000,
                        }} />
                    </AuthProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
