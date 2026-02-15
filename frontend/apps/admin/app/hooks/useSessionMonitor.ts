import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { auth } from '@dmt/api';

// Constants
const CHECK_INTERVAL = 60 * 1000; // Check every 1 minute
const PING_INTERVAL = 5 * 60 * 1000; // Ping backend every 5 minutes
const WARNING_THRESHOLD = 2 * 60 * 1000; // Warn 2 minutes before expiration
// Default token life if not parseable (30 mins)
const DEFAULT_TOKEN_LIFE = 30 * 60 * 1000;

interface UseSessionMonitorReturn {
    isSessionValid: boolean;
    sessionExpiresIn: number | null; // in seconds
    logout: () => Promise<void>;
}

export function useSessionMonitor(): UseSessionMonitorReturn {
    const router = useRouter();
    const [isSessionValid, setIsSessionValid] = useState(true);
    const [sessionExpiresIn, setSessionExpiresIn] = useState<number | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const warningShownRef = useRef(false);

    // Helper to decode JWT (simple version to get exp)
    const getTokenExpiration = (): number | null => {
        if (typeof window === 'undefined') return null;
        const token = localStorage.getItem('dmt-access-token');
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // exp is in seconds, convert to ms
            return payload.exp * 1000;
        } catch (e) {
            console.error('Failed to parse token', e);
            return null;
        }
    };

    const logout = useCallback(async () => {
        try {
            await auth.logout();
        } catch (e) {
            console.error('Logout failed', e);
        } finally {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('dmt-access-token');
                localStorage.removeItem('dmt-refresh-token');
                // Clear tenant info optionally, or keep it
                // localStorage.removeItem('dmt-tenant'); 
            }
            setIsSessionValid(false);
            toast.success('Logged out successfully');
            router.push('/auth/login');
        }
    }, [router]);

    const checkSession = useCallback(() => {
        const exp = getTokenExpiration();
        if (!exp) {
            // If no token and we thought it was valid, logout
            // But checking localstorage existence might be enough for public pages
            // For now, if we are in admin app, we expect a token.
            // We'll let the layout/guards handle strict redirects, 
            // but here we just update state.
            return;
        }

        const now = Date.now();
        const timeLeft = exp - now;

        setSessionExpiresIn(Math.floor(timeLeft / 1000));

        if (timeLeft <= 0) {
            // Expired
            toast.error('Session expired. Please log in again.');
            logout();
        } else if (timeLeft < WARNING_THRESHOLD && !warningShownRef.current) {
            // Warning
            toast('Your session will expire in 2 minutes.', {
                icon: '⚠️',
                duration: 5000,
            });
            warningShownRef.current = true;
        } else if (timeLeft > WARNING_THRESHOLD) {
            // Reset warning if we refreshed token
            warningShownRef.current = false;
        }
    }, [logout]);

    const pingBackend = useCallback(async () => {
        try {
            await auth.getProfile();
            // If successful, our interceptor might have refreshed the token if needed
            // causing localStorage to update.
            checkSession();
        } catch (error) {
            console.error('Session ping failed', error);
            // 401s are handled by interceptor (redirect to login)
            // But if interceptor fails to refresh, we might need to handle it here
            // For now, rely on interceptor logic in api/index.ts
        }
    }, [checkSession]);

    useEffect(() => {
        // Initial check
        checkSession();
        pingBackend();

        // Set up intervals
        checkIntervalRef.current = setInterval(checkSession, CHECK_INTERVAL);
        pingIntervalRef.current = setInterval(pingBackend, PING_INTERVAL);

        return () => {
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        };
    }, [checkSession, pingBackend]);

    return {
        isSessionValid,
        sessionExpiresIn,
        logout
    };
}
