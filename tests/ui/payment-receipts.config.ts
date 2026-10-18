import { defineConfig } from '@playwright/test';
import adjustments from './payment-adjustments.config';

export default defineConfig(adjustments, {
  testMatch: [...adjustments.testMatch as string[], 'payment-receipts-api.spec.ts', 'payment-receipts.spec.ts'],
  outputDir: '../../test-results/phase3c-ui',
});
