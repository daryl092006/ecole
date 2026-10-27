import { defineConfig } from '@playwright/test';
import base from './annual-offerings.config';
export default defineConfig({ ...base,
  testMatch: ['admissions-workflow.spec.ts','admissions-workflow-api.spec.ts','applications-menu.spec.ts','application-recovery.spec.ts','website-admissions.spec.ts','website-exchange.spec.ts'],
  outputDir: '../../test-results/admissions-workflow',
  webServer: { command: 'node scripts/run-next.mjs dev --port 3160', cwd: process.cwd(), env: { ESCEN_BUILD_DIR: 'tmp/next-admissions-tests', WATCHPACK_POLLING: 'true' }, url: 'http://127.0.0.1:3160/connexion', reuseExistingServer: true, timeout: 120000 },
  use: { ...base.use, baseURL: 'http://127.0.0.1:3160' },
});
