import { defineConfig } from '@playwright/test';
import base from './first-login.config';
export default defineConfig({ ...base, testMatch: ['student-course-links.spec.ts'], outputDir: '../../test-results/student-course-links' });
