import { defineConfig } from '@playwright/test';
import base from './attendance-management.config';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const server = Array.isArray(base.webServer) ? base.webServer[0] : base.webServer;
if (!server) throw new Error('Serveur de test manquant.');
const temporaryDirectory = resolve('tmp/screenshots/responsive-audit/browser-temp');
mkdirSync(temporaryDirectory, { recursive: true });
process.env.TEMP = temporaryDirectory;
process.env.TMP = temporaryDirectory;

export default defineConfig({
  ...base,
  testMatch: ['responsive-audit.spec.ts'], timeout: 900000,
  outputDir: '../../test-results/responsive-audit',
  webServer: { ...server, command: 'node scripts/run-responsive-audit-server.mjs', timeout: 600000, reuseExistingServer: false, env: { ...server.env, ESCEN_BUILD_DIR: '.next-responsive-audit', ESCEN_RESPONSIVE_AUDIT: '1', NODE_OPTIONS: '--max-old-space-size=3072', NODE_PATH: resolve('node_modules') } },
});
