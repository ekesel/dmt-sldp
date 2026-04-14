/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    trailingSlash: true,
    async redirects() {
        return [
            {
                source: '/dashboard',
                destination: '/',
                permanent: true,
            },
        ]
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*/',
                destination: 'http://backend:8000/api/:path*/',
            },
            {
                source: '/ws/:path*/',
                destination: 'http://backend:8000/ws/:path*/',
            },
        ];
    },
};

module.exports = nextConfig;
