import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.ESCEN_BUILD_DIR || '.next',
};

export default nextConfig;
