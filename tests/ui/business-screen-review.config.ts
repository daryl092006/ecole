import { defineConfig } from '@playwright/test';
import base from './window-safety.config';

export default defineConfig({
  ...base,
  testMatch: ['business-screen-review.spec.ts', 'auth-access.spec.ts', 'auth-session.spec.ts', 'password-command.spec.ts', 'course-programs.spec.ts', 'curriculum-catalog.spec.ts', 'document-context.spec.ts', 'resao-transcripts.spec.ts', 'website-admissions.spec.ts'],
  timeout: 120000,
  use: { ...base.use, actionTimeout: 12000 },
  outputDir: '../../test-results/business-screen-review',
  webServer: { ...base.webServer, command: 'node scripts/run-next.mjs dev --port 3117', cwd: process.cwd(), url: 'http://127.0.0.1:3117/connexion', reuseExistingServer: true, timeout: 120000, env: { ESCEN_BUILD_DIR: 'tmp/next-business-review' } },
});
