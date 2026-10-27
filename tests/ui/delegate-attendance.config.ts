import { defineConfig } from '@playwright/test';
import base from './attendance-management.config';
export default defineConfig({ ...base,
  testMatch: ['attendance-management-api.spec.ts', 'attendance-management.spec.ts', 'delegate-attendance-api.spec.ts', 'delegate-attendance.spec.ts'],
  outputDir: '../../test-results/delegate-attendance',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3161' },
  webServer: { command: 'node scripts/run-next.mjs dev --port 3161', cwd: process.cwd(), env: { ESCEN_BUILD_DIR: 'tmp/next-delegate-attendance', WATCHPACK_POLLING: 'true' }, url: 'http://127.0.0.1:3161/connexion', reuseExistingServer: true, timeout: 120000 },
});
