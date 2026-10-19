import { defineConfig } from '@playwright/test';
import base from './attendance-management.config';

export default defineConfig(base, {
  testMatch: ['annual-offerings.spec.ts', 'annual-setup-inline.spec.ts'],
  outputDir: '../../test-results/annual-offerings',
  webServer: {
    command: 'node scripts/run-next.mjs dev --port 3119', cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: 'tmp/next-annual-offerings', WATCHPACK_POLLING: 'true' },
    url: 'http://127.0.0.1:3119/connexion', reuseExistingServer: true, timeout: 120000,
  },
  use: { baseURL: 'http://127.0.0.1:3119' },
});
