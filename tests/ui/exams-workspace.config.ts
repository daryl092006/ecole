import { defineConfig } from '@playwright/test';
import base from './window-safety.config';

export default defineConfig({ ...base, testMatch: ['exams-workspace.spec.ts'], outputDir: '../../test-results/exams-workspace' });
