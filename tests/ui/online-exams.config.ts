import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: ['online-exams.spec.ts'], timeout: 60000, expect: { timeout: 12000 },
  workers: 1, reporter: 'list', outputDir: '../../test-results/online-exams-ui',
  use: { baseURL: 'http://127.0.0.1:3117', channel: 'chrome', headless: true, viewport: { width: 390, height: 844 }, trace: 'off' },
  webServer: { command: 'node scripts/run-next.mjs dev --port 3117', cwd: process.cwd(), env: { ESCEN_BUILD_DIR: '.next-ui-tests' }, url: 'http://127.0.0.1:3117/connexion', reuseExistingServer: true, timeout: 120000 },
});
