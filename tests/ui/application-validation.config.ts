import { defineConfig } from '@playwright/test';
import base from './support-workspace.config';
import { resolve } from 'node:path';
const resultDirectory = process.env.ESCEN_VALIDATION_RESULT_DIR || 'application-validation';

export default defineConfig({
  ...base,
  testMatch: [
    'auth-session.spec.ts', 'auth-access.spec.ts', 'password-command.spec.ts',
    'personal-exams-navigation.spec.ts', 'reference-presentation.spec.ts',
    'personnel-api.spec.ts', 'personnel-dossiers.spec.ts',
    'teacher-management-api.spec.ts', 'teacher-management.spec.ts',
    'reenrollment.spec.ts', 'tuition-fees.spec.ts', 'year-preparation.spec.ts',
    'payment-allocations-api.spec.ts', 'payment-adjustments-api.spec.ts',
    'payment-receipts-api.spec.ts', 'financial-projections-api.spec.ts',
    'student-operations.spec.ts', 'website-admissions.spec.ts',
    'website-levels.spec.ts', 'website-brochures.spec.ts',
    'complaints-api.spec.ts', 'complaints.spec.ts',
    'schedule-management-api.spec.ts', 'schedule-management.spec.ts',
    'attendance-management-api.spec.ts', 'attendance-management.spec.ts',
    'evaluation-write-scope.spec.ts', 'evaluation-transition-scope.spec.ts',
    'evaluation-grade-policy.spec.ts', 'evaluation-submission.spec.ts',
    'evaluation-candidates.spec.ts', 'exam-setup.spec.ts', 'online-exams.spec.ts',
    'support-workspace.spec.ts', 'communications-workspace.spec.ts',
    'purchases-workspace.spec.ts', 'student-documents.spec.ts',
    'audit-api.spec.ts', 'audit-journal.spec.ts', 'audit-export.spec.ts',
    'email-security.spec.ts', 'email-outbox.spec.ts',
  ],
  outputDir: `../../test-results/${resultDirectory}`,
  reporter: [['list'], ['json', { outputFile: resolve('test-results', resultDirectory, 'results.json') }]],
});
