import { defineConfig } from '@playwright/test';
import base from './subject-programming.config';

export default defineConfig({
  ...base,
  testMatch: ['subject-programming.spec.ts', 'online-exams.spec.ts', 'exams-workspace.spec.ts'],
  outputDir: '../../test-results/legacy-evaluation-parity',
  workers: 1,
  webServer: {
    command: 'node scripts/run-next.mjs dev --port 3135', cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: 'tmp/next-subject-programming', WATCHPACK_POLLING: '1000' },
    url: 'http://127.0.0.1:3135/connexion', reuseExistingServer: false, timeout: 180000,
  },
});
