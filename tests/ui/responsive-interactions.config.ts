import { defineConfig } from '@playwright/test';
import base from './responsive-review.config';

export default defineConfig({
  ...base,
  testMatch: ['responsive-interactions.spec.ts', 'responsive-corrections.spec.ts', 'window-safety.spec.ts'],
  outputDir: '../../test-results/responsive-interactions',
});
