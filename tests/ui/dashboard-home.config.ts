import { defineConfig } from '@playwright/test';
import base from './auth-session.config';
export default defineConfig(base, { testMatch: ['dashboard-home.spec.ts'], outputDir: '../../test-results/dashboard-home' });
