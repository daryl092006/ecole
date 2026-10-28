import { defineConfig } from '@playwright/test';
import base from './window-safety.config';
export default defineConfig({
  ...base,
  testMatch: ['auth-session.spec.ts', 'auth-access.spec.ts', 'password-command.spec.ts', 'action-emails.spec.ts'],
  outputDir: '../../test-results/auth-session',
  webServer: { command: 'node scripts/run-next.mjs dev --port 3117', cwd: process.cwd(), env: { ESCEN_BUILD_DIR: '.next-ui-tests', WATCHPACK_POLLING: 'true' }, url: 'http://127.0.0.1:3117/connexion', reuseExistingServer: true, timeout: 120000 },
});
