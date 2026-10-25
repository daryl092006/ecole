import { defineConfig } from '@playwright/test';
import base from './support-workspace.config';
export default defineConfig({ ...base, testMatch: ['student-documents.spec.ts'], outputDir: '../../test-results/student-documents' });
