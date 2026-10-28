import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'rpc-conflicts.spec.ts',
  workers: 1, reporter: 'list',
  outputDir: '../../test-results/rpc-conflicts',
});
