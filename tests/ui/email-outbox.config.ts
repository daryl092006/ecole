import { defineConfig } from '@playwright/test';
import base from './annual-offerings.config';

export default defineConfig(base, {
  testMatch: ['email-outbox.spec.ts', 'email-security.spec.ts'],
  outputDir: '../../test-results/email-outbox',
});
