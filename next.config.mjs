/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server actions configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
