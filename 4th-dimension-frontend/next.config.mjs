/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@4th-dimension/engine'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
