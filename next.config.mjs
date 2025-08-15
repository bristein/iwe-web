/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features for better performance
  experimental: {
    // Set server actions body size limit (for future use)
    serverActionsBodySizeLimit: '5mb',
  },
};

export default nextConfig;
