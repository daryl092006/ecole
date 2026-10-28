import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: ['auth-email-hook.spec.ts', 'auth-email-templates.spec.ts'],
  workers: 1, reporter: 'list', outputDir: '../../test-results/auth-email-hook',
  use: { channel: 'chrome', headless: true },
});
