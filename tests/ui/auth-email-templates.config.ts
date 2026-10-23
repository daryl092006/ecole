import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: ['auth-email-templates.spec.ts'],
  timeout: 30000, workers: 1, reporter: 'list',
  outputDir: '../../test-results/auth-email-templates',
  use: { channel: 'chrome', headless: true, trace: 'retain-on-failure' },
});
