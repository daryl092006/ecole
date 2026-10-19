import { defineConfig } from '@playwright/test';
import base from './responsive-audit.config';

export default defineConfig({
  ...base,
  testMatch: ['personal-exams-navigation.spec.ts'],
  timeout: 60000,
  outputDir: '../../test-results/personal-exams-navigation',
});
