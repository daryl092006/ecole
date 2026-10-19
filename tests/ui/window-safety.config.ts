import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['window-safety.spec.ts', 'evaluation-submission.spec.ts', 'evaluation-grade-policy.spec.ts'],
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: 'list',
  outputDir: '../../test-results/window-safety',
  use: { baseURL: 'http://127.0.0.1:3117', channel: 'chrome', headless: true, viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/run-next.mjs dev --port 3117',
    cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: '.next-ui-tests' },
    url: 'http://127.0.0.1:3117/connexion',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
