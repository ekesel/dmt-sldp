interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const cache = new Map<string, CacheEntry<unknown>>();
const MAX_CACHE_ENTRIES = 200;

export const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Phantom-typed cache key token that encapsulates the expected return type `T`.
 */
export interface TypedCacheKey<T> {
  readonly key: string;
  readonly _brand?: T;
}

/**
 * Factory helper to construct a strongly-typed cache key token.
 */
export function createCacheKey<T>(key: string): TypedCacheKey<T> {
  return { key };
}

function resolveKey<T>(keyOrToken: TypedCacheKey<T> | string): string {
  return typeof keyOrToken === 'string' ? keyOrToken : keyOrToken.key;
}

export function getCache<T>(keyOrToken: TypedCacheKey<T>): T | null;
export function getCache<T>(keyOrToken: string): T | null;
export function getCache<T>(keyOrToken: TypedCacheKey<T> | string): T | null {
  const key = resolveKey(keyOrToken); 
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCache<T>(keyOrToken: TypedCacheKey<T> | string, data: T, ttl: number = DEFAULT_TTL): void {
  const key = resolveKey(keyOrToken);

  // Prevent unbounded memory growth by evicting oldest entries if limit reached
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) {
      cache.delete(firstKey);
    }
  }

  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Invalidates cache entries.
 * - If no argument is provided, clears the entire cache.
 * - If a string or TypedCacheKey is provided, invalidates exact matches or any key starting with that prefix.
 * - If a RegExp is provided, invalidates any key matching the pattern.
 */
export function clearCache<T = unknown>(prefixOrPattern?: TypedCacheKey<T> | string | RegExp): void {
  if (!prefixOrPattern) {
    cache.clear();
    return;
  }

  const matcher = typeof prefixOrPattern === 'object' && 'key' in prefixOrPattern
    ? prefixOrPattern.key
    : prefixOrPattern;

  for (const key of Array.from(cache.keys())) {
    if (typeof matcher === 'string') {
      if (key === matcher || key.startsWith(matcher)) {
        cache.delete(key);
      }
    } else if (matcher.test(key)) {
      cache.delete(key);
    }
  }
}
