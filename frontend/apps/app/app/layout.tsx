import React from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'DMT Company Portal',
    description: 'Engineering Analytics & Compliance',
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-200`}>
                <AuthProvider>
                    {children}
                    <Toaster position="bottom-right" toastOptions={{
                        className: 'bg-slate-900 text-white border border-white/10',
                        duration: 5000,
                    }} />
                </AuthProvider>
            </body>
        </html>
    );
}
