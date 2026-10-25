import { defineConfig } from '@playwright/test';
import base from './exams-workspace.config';
export default defineConfig({ ...base, use: { ...base.use, baseURL: 'http://127.0.0.1:3134' }, webServer: { command: 'node scripts/run-next.mjs dev --port 3134', cwd: process.cwd(), env: { ESCEN_BUILD_DIR: 'tmp/next-past-exam-check' }, url: 'http://127.0.0.1:3134/connexion', reuseExistingServer: false, timeout: 120000 } });
