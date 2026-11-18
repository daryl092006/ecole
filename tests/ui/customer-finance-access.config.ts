import { defineConfig } from '@playwright/test';
import base from './window-safety.config';
export default defineConfig({
  ...base,
  testMatch: ['customer-finance-access.spec.ts'],
  outputDir: '../../test-results/customer-finance-access',
  webServer: {
    command: 'node scripts/run-next.mjs dev --port 3117', cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: '.next-ui-tests', ESCEN_RESPONSIVE_AUDIT: '1' },
    url: 'http://127.0.0.1:3117/connexion', reuseExistingServer: true, timeout: 120000,
  },
});
