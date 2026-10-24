import { defineConfig } from '@playwright/test';
import base from './visual-refresh.config';

process.env.ESCEN_RESPONSIVE_STAGE = 'after';
process.env.ESCEN_AUDIT_ARTIFACT_ROOT = 'tmp/screenshots/campus-presentation';

export default defineConfig({
  ...base,
  testMatch: ['responsive-audit.spec.ts', 'responsive-corrections.spec.ts', 'visual-refresh.spec.ts'],
  timeout: 900000,
  outputDir: '../../test-results/campus-presentation',
});
