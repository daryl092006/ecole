import { defineConfig } from '@playwright/test';
import base from './attendance-management.config';

export default defineConfig(base, {
  testMatch: ['payment-identity-correction.spec.ts', 'student-operations.spec.ts'],
  outputDir: '../../test-results/payment-identity-correction',
});
