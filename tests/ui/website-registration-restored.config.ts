import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'website-registration-restored.spec.ts',
  timeout: 60000, workers: 1, reporter: 'list',
  outputDir: '../../test-results/website-registration-restored',
  use: { baseURL: process.env.ESCEN_TEST_WEBSITE_URL || 'http://localhost:3200', channel: 'chrome', headless: true },
});
