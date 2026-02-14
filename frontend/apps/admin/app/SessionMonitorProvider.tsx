'use client';

import { ReactNode, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import useSessionMonitor from '../../../app/hooks/useSessionMonitor';

type Props = {
  children: ReactNode;
};

const PUBLIC_PATH_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
];

export default function SessionMonitorProvider({ children }: Props) {
  const pathname = usePathname();
  const isPublicAuthRoute =
    !!pathname && PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));

  // Stable callback (prevents hook dependency churn)
  const handleLogout = useCallback((reason: string) => {
    console.log('[SessionMonitor] Logged out:', reason);
  }, []);

  useSessionMonitor({
    enabled: !isPublicAuthRoute,
    onLogout: handleLogout,
  });

  return <>{children}</>;
}