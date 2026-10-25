import { defineConfig } from '@playwright/test';
import base from './support-workspace.config';
export default defineConfig({ ...base, testMatch: ['evaluation-candidates.spec.ts', 'exams-workspace.spec.ts', 'exam-setup.spec.ts', 'schedule-management.spec.ts'], outputDir: '../../test-results/exam-setup' });
