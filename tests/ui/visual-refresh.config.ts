import { defineConfig } from '@playwright/test';
import base from './attendance-management.config';

export default defineConfig({
  ...base,
  testMatch: ['responsive-corrections.spec.ts', 'visual-refresh.spec.ts'],
  outputDir: '../../test-results/visual-refresh',
  webServer: {
    command: 'node scripts/run-next.mjs dev --port 3117',
    cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: 'tmp/next-visual-refresh' },
    url: 'http://127.0.0.1:3117/connexion',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
