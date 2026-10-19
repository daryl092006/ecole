import { defineConfig } from '@playwright/test';
import base from './responsive-audit.config';

export default defineConfig({
  ...base,
  testMatch: ['responsive-corrections.spec.ts'],
  timeout: 60000,
  outputDir: '../../test-results/responsive-corrections',
});
