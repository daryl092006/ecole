import { defineConfig } from '@playwright/test';
import base from './responsive-audit.config';

process.env.ESCEN_RESPONSIVE_STAGE = 'after';
process.env.ESCEN_AUDIT_SCREEN = '^(sys_support|espace_support|acad_jury)$';
process.env.ESCEN_AUDIT_ARTIFACT_ROOT = 'tmp/screenshots/responsive-audit/cleanup';

export default defineConfig({
  ...base,
  outputDir: '../../test-results/legacy-cleanup',
});
