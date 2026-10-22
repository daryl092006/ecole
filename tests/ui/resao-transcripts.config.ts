import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: ['resao-transcripts.spec.ts', 'course-programs.spec.ts', 'curriculum-catalog.spec.ts', 'document-context.spec.ts'],
  timeout: 60000, expect: { timeout: 12000 }, workers: 1, reporter: 'list',
  outputDir: '../../test-results/resao-transcripts',
  use: { baseURL: 'http://127.0.0.1:3117', channel: 'chrome', headless: true, viewport: { width: 390, height: 844 }, trace: 'off', actionTimeout: 12000 },
  webServer: { command: 'node scripts/run-next.mjs dev --port 3117', cwd: process.cwd(), env: { ESCEN_BUILD_DIR: '.next-resao-tests', WATCHPACK_POLLING: 'true' }, url: 'http://127.0.0.1:3117/connexion', reuseExistingServer: true, timeout: 120000 },
});
