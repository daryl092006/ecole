import { defineConfig } from '@playwright/test';
import base from './annual-offerings.config';

export default defineConfig({
  ...base,
  testMatch: ['international-phone.spec.ts', 'personnel-dossiers.spec.ts', 'website-admissions.spec.ts'],
  outputDir: '../../test-results/international-phone',
});
