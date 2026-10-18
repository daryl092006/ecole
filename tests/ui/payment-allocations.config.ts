import { defineConfig } from '@playwright/test';
import attendance from './attendance-management.config';

export default defineConfig(attendance, {
  testMatch: ['payment-allocations-api.spec.ts', 'payment-allocations.spec.ts', 'student-operations.spec.ts'],
  outputDir: '../../test-results/phase3a-ui',
});
