import { defineConfig } from '@playwright/test';
import base from './window-safety.config';

export default defineConfig({
  ...base,
  testMatch: ['website-admissions.spec.ts'],
  outputDir: '../../test-results/website-level-documents',
});
