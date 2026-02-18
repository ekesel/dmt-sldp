import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Basic protection: Check if user is trying to access protected routes
    // For now, client-side AuthContext handles most logic, but middleware is good for redirects

    // We can't access localStorage in middleware (it's server-side edge).
    // We typically check cookies. But our auth uses localStorage.
    // So middleware can't do much unless we switch to cookies.
    // However, we can guard specific paths if we had cookies.

    // Since we use localStorage, we'll rely on client-side protection primarily.
    // But we can implement a basic "if accessing /dashboard without a token cookie" check if we had one.
    // For this task, user asked for Login Page. ProtectedRoute component (client-side) is already used in Layout?

    // Let's rely on dashboard layout checking AuthContext.
    // But to be thorough, I'll create a dummy middleware to allow future cookie implementation.
    // Strip port from host for X-Forwarded-Host to ensure django-tenants matches correctly
    const requestHeaders = new Headers(request.headers);
    const host = request.headers.get('host');
    if (host) {
        const hostname = host.split(':')[0]; // Remove port if present
        requestHeaders.set('x-forwarded-host', hostname);
    }

    // Manual API Proxy via Middleware to avoid next.config.js ambiguity
    if (request.nextUrl.pathname.startsWith('/api/')) {
        const newUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, 'http://backend:8000');
        return NextResponse.rewrite(newUrl, {
            request: {
                headers: requestHeaders,
            },
        });
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ['/dashboard/:path*', '/metrics/:path*', '/compliance/:path*', '/api/:path*'],
};
