import { defineConfig } from '@playwright/test';
import base from './student-dossier-review.config';

export default defineConfig({ ...base,
  testMatch: ['student-attendance.spec.ts', 'student-dossier-review.spec.ts'],
  outputDir: '../../test-results/student-attendance',
});
