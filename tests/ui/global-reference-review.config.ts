import { defineConfig } from '@playwright/test';
import base from './support-workspace.config';
export default defineConfig({ ...base, testMatch: ['page-by-page-review.spec.ts'], timeout: 900000, outputDir: '../../test-results/global-reference-review' });
