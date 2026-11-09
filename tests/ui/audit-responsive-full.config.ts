import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['audit-responsive-full.spec.ts'],
  timeout: 900000,
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
    headless: true,
  },
});

