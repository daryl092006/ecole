import { defineConfig } from '@playwright/test';
import receipts from './payment-receipts.config';

export default defineConfig(receipts, {
  testMatch: [...receipts.testMatch as string[], 'financial-projections-api.spec.ts', 'financial-projections.spec.ts'],
  outputDir: '../../test-results/phase3d-ui',
});
