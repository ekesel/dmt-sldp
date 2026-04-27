import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatTimestamp(
  timestamp?: string,
  fallback: string = "Recently",
  includeYear: boolean = true
) {
  if (!timestamp) return fallback;
  try {
    const raw = timestamp.toString().trim();
    // Handle timezone mismatch: if no Z/+/GMT, assume UTC
    const dateStr = (raw.includes('Z') || raw.includes('+') || raw.includes('GMT'))
      ? raw
      : `${raw.replace(' ', 'T')}Z`;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return fallback;

    const relative = formatDistanceToNow(date, { addSuffix: true });
    const absolute = date.toLocaleString([], {
      ...(includeYear && { year: 'numeric' }),
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${absolute} • ${relative}`;
  } catch (e) {
    return fallback;
  }
}

