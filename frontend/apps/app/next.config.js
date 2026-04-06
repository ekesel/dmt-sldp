/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@dmt/api', '@dmt/ui'],
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

};

module.exports = nextConfig;
