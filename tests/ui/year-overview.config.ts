import { defineConfig } from '@playwright/test';
import base from './simplified-navigation.config';

export default defineConfig({ ...base,
  testMatch: ['year-overview.spec.ts', 'year-preparation.spec.ts'],
  outputDir: '../../test-results/year-overview',
});
