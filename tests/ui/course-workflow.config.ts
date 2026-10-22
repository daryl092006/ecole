import { defineConfig } from '@playwright/test';
import base from './window-safety.config';

export default defineConfig({
  ...base,
  testMatch: ['course-programs.spec.ts', 'schedule-management.spec.ts', 'resao-transcripts.spec.ts', 'exams-workspace.spec.ts'],
  outputDir: '../../test-results/course-workflow',
  webServer: { ...base.webServer, command: 'node scripts/run-next.mjs dev --port 3117', cwd: process.cwd(), url: 'http://127.0.0.1:3117/connexion', reuseExistingServer: true, timeout: 120000,
    env: { ESCEN_BUILD_DIR: '.next-ui-tests', WATCHPACK_POLLING: 'true', ESCEN_RESPONSIVE_AUDIT: '1' } },
});
