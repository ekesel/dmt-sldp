const pendingRequests = new Map<string, Promise<any>>();

/**
 * Deduplicates concurrent requests for the same key.
 * If a request is already in progress for the given key, returns the existing promise.
 * Otherwise, executes the request function and caches the promise until it resolves or rejects.
 */
export function deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key) as Promise<T>;
    }

    const promise = requestFn().finally(() => {
        pendingRequests.delete(key);
    });

    pendingRequests.set(key, promise);
    return promise;
}
