import { defineConfig } from '@playwright/test';
import base from './global-reference-review.config';
import { resolve } from 'node:path';
const port = process.env.ESCEN_VALIDATION_PORT || '3120';

export default defineConfig({
  ...base,
  testMatch: ['page-by-page-review.spec.ts', 'exams-workspace.spec.ts'],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  outputDir: '../../test-results/application-pages',
  reporter: [['list'], ['json', { outputFile: resolve('test-results/application-pages/results.json') }]],
  webServer: {
    command: `node scripts/run-next.mjs start --port ${port}`,
    cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: process.env.ESCEN_BUILD_DIR || 'tmp/next-application-validation' },
    url: `http://127.0.0.1:${port}/connexion`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
