import { defineConfig } from '@playwright/test';
import base from './resao-transcripts.config';

export default defineConfig({
  ...base,
  testMatch: ['loading-feedback.spec.ts'],
  outputDir: '../../test-results/loading-feedback',
});
