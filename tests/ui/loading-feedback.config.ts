import { defineConfig } from '@playwright/test';
import base from './interconnection-summary.config';

export default defineConfig({
  ...base,
  testMatch: ['loading-feedback.spec.ts', 'persistent-data.spec.ts'],
  outputDir: '../../test-results/loading-feedback',
});
