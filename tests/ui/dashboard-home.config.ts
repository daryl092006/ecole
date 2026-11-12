import { defineConfig } from '@playwright/test';
import base from './responsive-audit.config';
export default defineConfig(base, { testMatch: ['dashboard-home.spec.ts', 'responsive-audit.spec.ts', 'staff-ergonomics.spec.ts'], outputDir: '../../test-results/dashboard-home' });
