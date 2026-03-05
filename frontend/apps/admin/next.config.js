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
                source: '/ws/:path*',
                destination: `http://backend:${process.env.BACKEND_PORT || process.env.NEXT_PUBLIC_BACKEND_PORT || '8000'}/ws/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
