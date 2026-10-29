import { defineConfig } from '@playwright/test';
import base from './window-safety.config';

export default defineConfig({
  ...base,
  testMatch: ['international-phone.spec.ts'],
  outputDir: '../../test-results/detail-input-guard',
});
