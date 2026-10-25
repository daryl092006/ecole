import { defineConfig } from '@playwright/test';
import base from './support-workspace.config';
export default defineConfig({ ...base, testMatch: ['support-workspace.spec.ts', 'communications-workspace.spec.ts', 'purchases-workspace.spec.ts'], outputDir: '../../test-results/functional-completion' });
