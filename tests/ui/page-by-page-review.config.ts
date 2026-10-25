import { defineConfig } from '@playwright/test';
import base from './campus-presentation.config';
import { resolve } from 'node:path';

export default defineConfig({
  ...base,
  testMatch: ['page-by-page-review.spec.ts'],
  outputDir: '../../test-results/page-by-page-review',
  webServer: {
    command: 'node scripts/run-responsive-audit-server.mjs',
    cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: 'tmp/next-page-review-build', ESCEN_RESPONSIVE_AUDIT: '1', NODE_PATH: resolve('node_modules') },
    url: 'http://127.0.0.1:3117/connexion',
    reuseExistingServer: !process.env.CI,
    timeout: 600000,
  },
});
