import { defineConfig } from '@playwright/test';

// Server-only tests: mocked HTTP, no running application or external service.
export default defineConfig({
  testDir: '.', testMatch: 'email-security.spec.ts', workers: 1,
  reporter: 'list', outputDir: '../../test-results/email-transport',
});
