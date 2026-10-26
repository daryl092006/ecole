import { defineConfig } from '@playwright/test';
import base from './simplified-navigation.config';

process.env.ESCEN_RESPONSIVE_STAGE = 'after';
process.env.ESCEN_AUDIT_ARTIFACT_ROOT = 'tmp/screenshots/simplification-globale';
process.env.ESCEN_AUDIT_SCREEN ??= '^(espace_dashboard|student_home|stud_list|stud_status|fin_payments|fin_reports|acad_schedule|acad_program|acad_grades|acad_settings|web_documents|sys_support|comm_announcements|log_purchases|staff_records|staff_list|student_record)$';

export default defineConfig({
  ...base,
  testMatch: ['responsive-audit.spec.ts'],
  timeout: 900000,
  outputDir: '../../test-results/simplified-responsive',
});
