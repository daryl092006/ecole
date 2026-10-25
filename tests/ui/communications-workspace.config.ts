import { defineConfig } from '@playwright/test';
import base from './support-workspace.config';
export default defineConfig({ ...base, testMatch: ['communications-workspace.spec.ts', 'support-workspace.spec.ts'], outputDir: '../../test-results/communications-workspace' });
