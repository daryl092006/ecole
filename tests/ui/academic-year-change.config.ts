import { defineConfig } from '@playwright/test';
import base from './annual-offerings.config';

export default defineConfig({
  ...base,
  testMatch: ['academic-years.spec.ts'],
  outputDir: '../../test-results/academic-year-change',
});
