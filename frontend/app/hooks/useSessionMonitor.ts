'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '../../packages/api';

type LogoutReason =
  | 'token_expired'
  | 'token_invalid'
  | 'missing_refresh_token'
  | 'session_invalid'
  | 'manual_logout'
  | 'profile_check_failed';

interface UseSessionMonitorOptions {
  enabled?: boolean;
  onLogout?: (reason: LogoutReason) => void | Promise<void>;
  loginPath?: string;
  pingIntervalMs?: number;
  warningThresholdSeconds?: number;
}

interface UseSessionMonitorReturn {
  isSessionValid: boolean;
  sessionExpiresIn: number; // seconds
  logout: () => Promise<void>;
}

function getTokenExpiryEpochSeconds(token: string | null): number | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const payloadBase64Url = parts[1];
    const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);

    return typeof payload?.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function showWarningToast(message: string): void {
  if (typeof window !== 'undefined') {
    const w = window as any;
    if (w?.toast?.warning) {
      w.toast.warning(message);
      return;
    }
    if (w?.toast?.error) {
      w.toast.error(message);
      return;
    }
  }

  // Fallback
  console.warn('[SessionMonitor] WARNING:', message);
}

export function useSessionMonitor(
  options: UseSessionMonitorOptions = {}
): UseSessionMonitorReturn {
  const {
    enabled = true,
    onLogout,
    loginPath = '/auth/login',
    pingIntervalMs = 5 * 60 * 1000, // 5 minutes
    warningThresholdSeconds = 120, // 2 minutes
  } = options;

  const [isSessionValid, setIsSessionValid] = useState<boolean>(true);
  const [sessionExpiresIn, setSessionExpiresIn] = useState<number>(0);

  const warningShownForTokenRef = useRef<string | null>(null);
  const isLoggingOutRef = useRef(false);
  const lastProfileCheckAtRef = useRef<number>(0);

  // Keep latest onLogout without forcing callback identity churn downstream
  const onLogoutRef = useRef<UseSessionMonitorOptions['onLogout']>(onLogout);
  useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  const getAccessToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('dmt-access-token');
  }, []);

  const getRefreshToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('dmt-refresh-token');
  }, []);

  const clearSession = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('dmt-access-token');
    localStorage.removeItem('dmt-refresh-token');
    localStorage.removeItem('dmt-tenant'); // optional; keep if your app uses this
  }, []);

  const redirectToLogin = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname.startsWith('/auth/login')) return; // prevent loop
    window.location.href = loginPath;
  }, [loginPath]);

  const handleLogout = useCallback(
    async (reason: LogoutReason) => {
      // If monitor disabled (auth/public routes), do nothing
      if (!enabled) return;
      if (isLoggingOutRef.current) return;
      isLoggingOutRef.current = true;

      try {
        const isLoginRoute =
          typeof window !== 'undefined' &&
          window.location.pathname.startsWith('/auth/login');

        // Avoid logout API spam on login page
        if (!isLoginRoute) {
          try {
            const accessToken = getAccessToken();
            if (accessToken) {
              await auth.logout();
            }
          } catch {
            // ignore backend logout failures
          }
        }

        clearSession();
        setIsSessionValid(false);
        setSessionExpiresIn(0);

        if (onLogoutRef.current) {
          await onLogoutRef.current(reason);
        }

        redirectToLogin();
      } finally {
        isLoggingOutRef.current = false;
      }
    },
    [enabled, clearSession, redirectToLogin, getAccessToken]
  );

  const logout = useCallback(async () => {
    await handleLogout('manual_logout');
  }, [handleLogout]);

  const evaluateTokenLifetime = useCallback(async () => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    // Required behavior: no refresh token => logout
    if (!refreshToken) {
      await handleLogout('missing_refresh_token');
      return;
    }

    const exp = getTokenExpiryEpochSeconds(accessToken);
    if (!exp) {
      await handleLogout('token_invalid');
      return;
    }

    const remaining = Math.max(0, exp - nowEpochSeconds());
    setSessionExpiresIn(remaining);

    // Warn 2 minutes before expiry (once per token)
    if (
      remaining > 0 &&
      remaining <= warningThresholdSeconds &&
      warningShownForTokenRef.current !== accessToken
    ) {
      warningShownForTokenRef.current = accessToken;
      showWarningToast('Your session will expire in less than 2 minutes. Please save your work.');
    }

    if (remaining <= 0) {
      await handleLogout('token_expired');
      return;
    }

    setIsSessionValid(true);
  }, [getAccessToken, getRefreshToken, handleLogout, warningThresholdSeconds]);

  const validateSessionWithBackend = useCallback(async () => {
    try {
      // Requirement: ping backend profile endpoint
      await auth.getProfile();
      setIsSessionValid(true);
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;

      if (status === 401) {
        await handleLogout('session_invalid');
        return;
      }

      // Non-401 errors: mark invalid (network/server issues)
      setIsSessionValid(false);

      // If local tokens are obviously bad, force logout
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      const exp = getTokenExpiryEpochSeconds(accessToken);

      if (!refreshToken || !exp || exp <= nowEpochSeconds()) {
        await handleLogout('profile_check_failed');
      }
    }
  }, [getAccessToken, getRefreshToken, handleLogout]);

  // 1-second token countdown monitor
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    void evaluateTokenLifetime();

    const countdownInterval = window.setInterval(() => {
      void evaluateTokenLifetime();
    }, 1000);

    return () => {
      window.clearInterval(countdownInterval);
    };
  }, [enabled, evaluateTokenLifetime]);

  // 5-minute backend session validation (with throttle on immediate call)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const now = Date.now();
    if (now - lastProfileCheckAtRef.current > 15_000) {
      lastProfileCheckAtRef.current = now;
      void validateSessionWithBackend();
    }

    const profileInterval = window.setInterval(() => {
      lastProfileCheckAtRef.current = Date.now();
      void validateSessionWithBackend();
    }, pingIntervalMs);

    return () => {
      window.clearInterval(profileInterval);
    };
  }, [enabled, pingIntervalMs, validateSessionWithBackend]);

  return useMemo(
    () => ({
      isSessionValid,
      sessionExpiresIn,
      logout,
    }),
    [isSessionValid, sessionExpiresIn, logout]
  );
}

export default useSessionMonitor;