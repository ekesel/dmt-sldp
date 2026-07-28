import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Extract subdomain from hostname
  let subdomain = '';
  
  if (hostname.includes('elevate.samta.ai')) {
      const match = hostname.match(/^([^.]+)\.elevate\.samta\.ai/);
      if (match) {
          subdomain = match[1];
      }
  } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      // Handle local development (e.g. abc.localhost:3000)
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[0] !== 'localhost' && !parts[0].match(/^\d+$/)) {
          subdomain = parts[0];
      }
  }

  // If there is a subdomain, validate it
  if (subdomain && subdomain !== 'www') {
    try {
      const apiUrl = `https://api.elevate.samta.ai/api/check-tenant/?name=${subdomain}`;
      const res = await fetch(apiUrl);
      
      if (res.ok) {
        const data = await res.json();
        // The API returns {"valid": false} if the tenant does not exist
        if (data.valid === false) {
          // Rewrite the request to the 404 page without changing the URL
          return NextResponse.rewrite(new URL('/404', request.url));
        }
      } else {
        console.error('Failed to validate tenant, API returned status:', res.status);
      }
    } catch (error) {
      console.error('Error validating tenant:', error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - 404 (to avoid infinite redirects)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|404).*)',
  ],
};
