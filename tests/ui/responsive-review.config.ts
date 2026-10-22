import { defineConfig } from '@playwright/test';
import base from './resao-transcripts.config';

process.env.ESCEN_AUDIT_ARTIFACT_ROOT = 'tmp/screenshots/responsive-review';
process.env.ESCEN_RESPONSIVE_STAGE = 'after';
export default defineConfig({
  ...base,
  testMatch: ['responsive-audit.spec.ts'],
  timeout: 900000,
  outputDir: '../../test-results/responsive-review',
  webServer: { command: 'node scripts/run-next.mjs dev --port 3117', cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: '.next-ui-tests', WATCHPACK_POLLING: 'true' },
    url: 'http://127.0.0.1:3117/connexion', reuseExistingServer: true, timeout: 120000 },
});
