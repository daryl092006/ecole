import { defineConfig } from '@playwright/test';
import base from './global-simplification.config';

process.env.ESCEN_AUDIT_ARTIFACT_ROOT = 'tmp/screenshots/page-harmonisation-2026-10-27';
process.env.ESCEN_RESPONSIVE_STAGE ||= 'after';
process.env.ESCEN_AUDIT_WIDTHS ||= '360,390,768,1024,1440';

export default defineConfig({
  ...base,
  testMatch: [
    'responsive-audit.spec.ts',
    'attendance-management.spec.ts',
    'simplified-navigation.spec.ts',
    'window-safety.spec.ts',
  ],
  timeout: 900000,
  outputDir: '../../test-results/harmonisation',
  webServer: {
    command: 'node scripts/run-responsive-audit-server.mjs',
    cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: 'tmp/next-page-audit-harmonisation', ESCEN_RESPONSIVE_AUDIT: '1' },
    url: 'http://127.0.0.1:3117/connexion',
    reuseExistingServer: false,
    timeout: 600000,
  },
});
