import { defineConfig } from '@playwright/test';
import base from './support-workspace.config';

export default defineConfig({
  ...base,
  testMatch: ['visual-refresh.spec.ts', 'responsive-corrections.spec.ts', 'reference-presentation.spec.ts'],
  outputDir: '../../test-results/reference-presentation',
});
