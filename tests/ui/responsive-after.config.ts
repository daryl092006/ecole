import { defineConfig } from '@playwright/test';
import base from './responsive-audit.config';

process.env.ESCEN_RESPONSIVE_STAGE = 'after';
if (process.env.ESCEN_AUDIT_SCREEN || process.env.ESCEN_AUDIT_WIDTH) {
  throw new Error('La validation 4C exige tous les écrans et toutes les largeurs.');
}

export default defineConfig({
  ...base,
  outputDir: '../../test-results/responsive-after',
});
