import { defineConfig } from '@playwright/test';
import base from './auth-session.config';
export default defineConfig(base, { testMatch: ['first-login.spec.ts', 'auth-cache.spec.ts', 'auth-session.spec.ts', 'auth-access.spec.ts', 'password-command.spec.ts', 'dashboard-home.spec.ts'], outputDir: '../../test-results/first-login' });
