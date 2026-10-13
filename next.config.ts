import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.ESCEN_BUILD_DIR || '.next',
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
