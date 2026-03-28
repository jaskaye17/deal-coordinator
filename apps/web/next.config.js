/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@deal-coordinator/shared', '@deal-coordinator/ui'],
  experimental: {
    serverComponentsExternalPackages: [],
  },
  /** Debounce rebuilds in dev to reduce flaky 500s / `chunks/fallback` failures after rapid saves. */
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 400,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
