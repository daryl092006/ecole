import { defineConfig } from '@playwright/test';
import attendance from './attendance-management.config';

export default defineConfig(attendance, {
  testMatch: ['payment-adjustments-api.spec.ts', 'payment-adjustments.spec.ts', 'payment-allocations-api.spec.ts', 'payment-allocations.spec.ts', 'student-operations.spec.ts'],
  outputDir: '../../test-results/phase3b-ui',
});
