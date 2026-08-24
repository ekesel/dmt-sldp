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

export function getFileViewerUrl(url: string) {
    const baseUrl = url.split(/[?#]/)[0];
    const lowerUrl = baseUrl.toLowerCase();
    if (lowerUrl.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/)) {
        return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
    }
    return url;
}

export function getUserDisplayName(
  user?: {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null,
  fallback: string = "Unknown User"
): string {
  if (!user) return fallback;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (user.username) {
    return user.username.includes("@") ? user.username.split("@")[0] : user.username;
  }
  if (user.email) {
    return user.email.split("@")[0];
  }
  return fallback;
}

