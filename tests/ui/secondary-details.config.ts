import { defineConfig } from '@playwright/test';
import base from './simplified-navigation.config';

export default defineConfig({ ...base,
  testMatch: ['secondary-details.spec.ts', 'payment-adjustments.spec.ts', 'payment-allocations.spec.ts', 'payment-receipts.spec.ts', 'complaints.spec.ts'],
  outputDir: '../../test-results/secondary-details',
});
