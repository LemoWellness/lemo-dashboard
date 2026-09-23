/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/push/sw-config.js', destination: '/api/push/sw-config' },
    ];
  },
};

module.exports = nextConfig;
