import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.ESCEN_BUILD_DIR || '.next',
  outputFileTracingRoot: process.cwd(),
  experimental: process.env.ESCEN_RESPONSIVE_AUDIT === '1' ? { cpus: 1 } : undefined,
  webpack: process.env.ESCEN_RESPONSIVE_AUDIT === '1' ? config => {
    config.cache = false;
    return config;
  } : undefined,
};

export default nextConfig;
