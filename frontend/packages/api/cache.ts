interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

const cache = new Map<string, CacheEntry<any>>();

export const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function getCache<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
        cache.delete(key);
        return null;
    }

    return entry.data;
}

export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
    });
}

export function clearCache(key?: string): void {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
}
