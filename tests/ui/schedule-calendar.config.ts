import { defineConfig } from '@playwright/test';
import base from './annual-offerings.config';

export default defineConfig(base, {
  testMatch: ['schedule-management.spec.ts'],
  outputDir: '../../test-results/schedule-calendar',
});
