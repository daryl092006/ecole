import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['evaluation-grade-policy.spec.ts'],
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: 'list',
  outputDir: '../../test-results/evaluation-grade-policy-regression',
  use: { baseURL: 'http://127.0.0.1:3123', channel: 'chrome', headless: true, viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/run-next.mjs dev --port 3123',
    cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: 'tmp/next-grade-policy-regression' },
    url: 'http://127.0.0.1:3123/connexion',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
