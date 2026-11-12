import { defineConfig } from '@playwright/test';
import base from './responsive-audit.config';
process.env.ESCEN_RESPONSIVE_STAGE ||= 'after';
export default defineConfig({ ...base, testMatch: ['page-layout.spec.ts', 'responsive-audit.spec.ts'], outputDir: '../../test-results/page-layout' });
