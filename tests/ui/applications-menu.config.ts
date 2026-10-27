import { defineConfig } from '@playwright/test';
import base from './annual-offerings.config';

export default defineConfig(base, {
  testMatch: ['applications-menu.spec.ts'],
  outputDir: '../../test-results/applications-menu',
});
