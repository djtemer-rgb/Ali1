/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable Webpack caching in development to prevent ENOENT cache rename errors
      // caused by Unicode path normalization mismatch on macOS (e.g. "Проекты").
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
