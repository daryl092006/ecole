import { defineConfig } from '@playwright/test';
import base from './support-workspace.config';
export default defineConfig({ ...base, testMatch: ['purchases-workspace.spec.ts'], outputDir: '../../test-results/purchases-workspace' });
