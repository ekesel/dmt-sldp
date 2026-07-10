'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export default function SessionTimeoutManager() {
    const { isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (isAuthenticated) {
            timerRef.current = setTimeout(async () => {
                await logout();
                router.push('/auth/login?expired=true');
            }, TIMEOUT_MS);
        }
    }, [isAuthenticated, logout, router]);

    useEffect(() => {
        if (!isAuthenticated) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            return;
        }

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        const handleActivity = () => {
            resetTimer();
        };

        // Initialize timer on mount
        resetTimer();

        // Add event listeners
        events.forEach((event) => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [isAuthenticated, resetTimer]);

    return null;
}
