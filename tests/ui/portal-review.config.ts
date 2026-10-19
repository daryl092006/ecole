import { defineConfig } from '@playwright/test';
import base from './annual-offerings.config';

export default defineConfig(base, {
  testMatch: ['responsive-audit.spec.ts', 'website-exchange.spec.ts', 'website-menu.spec.ts', 'website-admissions.spec.ts', 'action-emails.spec.ts', 'online-exams.spec.ts', 'evaluation-grade-policy.spec.ts', 'evaluation-submission.spec.ts', 'evaluation-candidates.spec.ts', 'personal-exams-navigation.spec.ts'],
  timeout: 900000,
  outputDir: '../../test-results/portal-review',
  webServer: {
    command: 'node scripts/run-next.mjs dev --port 3117', cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: 'tmp/next-annual-offerings', WATCHPACK_POLLING: 'true' },
    url: 'http://127.0.0.1:3117/connexion', reuseExistingServer: true, timeout: 120000,
  },
  use: { baseURL: 'http://127.0.0.1:3117' },
});
