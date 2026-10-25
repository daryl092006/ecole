import { defineConfig } from '@playwright/test';
import base from './support-workspace.config';
export default defineConfig({ ...base,
  testMatch: ['subject-programming.spec.ts', 'exam-setup.spec.ts', 'exams-workspace.spec.ts'], outputDir: '../../test-results/subject-programming',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3135' },
  webServer: { command: 'node scripts/run-next.mjs dev --port 3135', cwd: process.cwd(), env: { ESCEN_BUILD_DIR: 'tmp/next-subject-programming' }, url: 'http://127.0.0.1:3135/connexion', reuseExistingServer: !process.env.CI, timeout: 180000 },
});
