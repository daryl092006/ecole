import { defineConfig } from '@playwright/test';
import base from './page-by-page-review.config';
export default defineConfig({
  ...base,
  testMatch: ['support-workspace.spec.ts'],
  timeout: 180000,
  outputDir: '../../test-results/support-workspace',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3118' },
  webServer: { command: 'node scripts/run-next.mjs dev --port 3118', cwd: process.cwd(), env: { ESCEN_BUILD_DIR: 'tmp/next-support-workspace', ESCEN_RESPONSIVE_AUDIT: '1' }, url: 'http://127.0.0.1:3118/connexion', reuseExistingServer: !process.env.CI, timeout: 120000 },
});
