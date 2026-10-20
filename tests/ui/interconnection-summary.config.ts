import { defineConfig } from '@playwright/test';
import base from './teacher-management.config';

export default defineConfig({
  ...base,
  testMatch: ['teacher-management.spec.ts', 'student-operations.spec.ts'],
  outputDir: '../../test-results/interconnection-summary',
  webServer: {
    command: 'node scripts/run-next.mjs dev --port 3117',
    cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: 'tmp/next-visual-refresh', ESCEN_RESPONSIVE_AUDIT: '1' },
    url: 'http://127.0.0.1:3117/connexion',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
