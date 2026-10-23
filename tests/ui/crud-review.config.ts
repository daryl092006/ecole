import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['crud-persistence.spec.ts'],
  timeout: 90000, expect: { timeout: 12000 }, workers: 1, reporter: 'list',
  outputDir: '../../test-results/crud-review',
});
