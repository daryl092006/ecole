import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'.',testMatch:['scholarship-review-api.spec.ts'],workers:1,reporter:'list',
  timeout:30000,outputDir:'../../test-results/scholarship-review',
});
