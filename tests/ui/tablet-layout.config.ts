import { defineConfig } from '@playwright/test';
import base from './simplified-navigation.config';

export default defineConfig({
  ...base,
  testMatch: ['tablet-layout.spec.ts'],
  outputDir: '../../test-results/tablet-layout',
});
