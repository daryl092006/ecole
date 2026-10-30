import { defineConfig } from '@playwright/test';
import base from './window-safety.config';

export default defineConfig({
  ...base,
  testMatch: ['student-operations.spec.ts', 'financial-projections-api.spec.ts'],
  outputDir: '../../test-results/enrollment-finance-review',
});
