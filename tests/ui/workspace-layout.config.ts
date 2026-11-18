import { defineConfig } from '@playwright/test';
import base from './window-safety.config';

export default defineConfig({
  ...base,
  testMatch: ['workspace-layout.spec.ts'],
  timeout: 900000,
  use: { ...base.use, trace: 'off' },
  webServer: {
    command: 'node scripts/run-next.mjs dev --port 3117', cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: '.next-ui-tests', ESCEN_RESPONSIVE_AUDIT: '1', WATCHPACK_POLLING: 'true' },
    url: 'http://127.0.0.1:3117/connexion', reuseExistingServer: false, timeout: 120000,
  },
  outputDir: '../../test-results/workspace-layout',
});
