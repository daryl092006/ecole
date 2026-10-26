import { defineConfig } from '@playwright/test';
import base from './secondary-details.config';

export default defineConfig({ ...base,
  testMatch: [
    'secondary-details.spec.ts', 'payment-adjustments.spec.ts', 'payment-allocations.spec.ts', 'payment-receipts.spec.ts',
    'complaints.spec.ts', 'student-operations.spec.ts', 'student-document-dossier.spec.ts', 'student-documents.spec.ts',
    'support-workspace.spec.ts', 'purchases-workspace.spec.ts', 'communications-workspace.spec.ts',
    'personnel-dossiers.spec.ts', 'year-overview.spec.ts', 'student-attendance.spec.ts',
    'simplified-navigation.spec.ts', 'personal-exams-navigation.spec.ts', 'student-dossier-keys.spec.ts',
    'student-dossier-review.spec.ts', 'tablet-layout.spec.ts', 'course-programs.spec.ts',
    'schedule-management.spec.ts', 'attendance-management.spec.ts', 'exams-workspace.spec.ts',
  ],
  timeout: 180000,
  outputDir: '../../test-results/global-simplification',
});
