/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    trailingSlash: true,
    transpilePackages: ['@dmt/api', '@dmt/ui'],
    async redirects() {
        return [
            {
                source: '/dashboard',
                destination: '/',
                permanent: true,
            },
        ]
    },
    // Removed rewrites(): Nginx handles /api/ and /ws/ on api.elevate.samta.ai directly.
};

module.exports = nextConfig;
