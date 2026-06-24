import { NextResponse } from 'next/server';

function isAllowedDownloadUrl(urlStr: string): boolean {
    try {
        if (process.env.NODE_ENV === 'development') {
            return true;
        }
        const url = new URL(urlStr);
        if (url.protocol !== 'https:') {
            return false;
        }
        const hostname = url.hostname;
        
        if (hostname === 'localhost' || hostname === '[::1]') return false;

        const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const match = hostname.match(ipv4Regex);
        if (match) {
            const octet1 = parseInt(match[1], 10);
            const octet2 = parseInt(match[2], 10);
            if (octet1 === 10) return false;
            if (octet1 === 127) return false;
            if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;
            if (octet1 === 192 && octet2 === 168) return false;
            if (octet1 === 169 && octet2 === 254) return false;
        }
        return true;
    } catch {
        return false;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'download';

    if (!fileUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    if (!isAllowedDownloadUrl(fileUrl)) {
        return new NextResponse('Invalid or forbidden url parameter', { status: 400 });
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

        const response = await fetch(fileUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        const headers = new Headers();
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);
        headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
        
        return new NextResponse(response.body, { headers, status: response.status || 200 });
    } catch (error) {
        console.error('Proxy download error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
