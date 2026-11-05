'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { WorkloadWarning } from '@dmt/api';

interface Props {
  warnings?: WorkloadWarning[];
  className?: string;
}

export function WorkloadWarningsBanner({ warnings, className = '' }: Props) {
  const [dismissed, setDismissed] = React.useState<Record<string, boolean>>({});

  if (!warnings || warnings.length === 0) return null;

  const visibleWarnings = warnings.filter(
    (w) =>
      !dismissed[w.code] &&
      w.code !== 'allocation_not_published' &&
      w.code !== 'level_not_set' &&
      !w.message.includes('Allocation sheet for') &&
      !w.message.includes('Level is not set for')
  );
  if (visibleWarnings.length === 0) return null;

  const getActionLink = (code: string) => {
    switch (code) {
      case 'settings_not_set':
        return { href: '/company-baseline', label: 'Company Baseline' };
      case 'allocation_not_published':
      case 'allocation_not_set':
        return { href: '/resource-allocation', label: 'Resource Allocation' };
      case 'level_not_set':
        return { href: '/users', label: 'Users' };
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {visibleWarnings.map((w, idx) => {
        const link = getActionLink(w.code);
        return (
          <div
            key={`${w.code}-${idx}`}
            className="flex items-start sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs sm:text-sm font-medium animate-in fade-in duration-300 shadow-sm"
          >
            <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-amber-500" />
              <span className="text-foreground/90 font-medium leading-relaxed">{w.message}</span>
              {link && (
                <Link
                  href={link.href}
                  className="inline-flex items-center gap-1 font-semibold text-amber-500 hover:text-amber-400 hover:underline shrink-0 ml-1"
                >
                  {link.label}
                  <ExternalLink size={12} />
                </Link>
              )}
            </div>
            <button
              onClick={() => setDismissed((prev) => ({ ...prev, [w.code]: true }))}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition hover:bg-amber-500/10 shrink-0"
              title="Dismiss warning"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

