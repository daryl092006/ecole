import { defineConfig } from '@playwright/test';
import base from './attendance-management.config';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const server = Array.isArray(base.webServer) ? base.webServer[0] : base.webServer;
if (!server) throw new Error('Serveur de test manquant.');
const port = Number(process.env.ESCEN_AUDIT_PORT || 3117);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port d’audit invalide.');
const baseURL = `http://127.0.0.1:${port}`;
const temporaryDirectory = resolve(`${process.env.ESCEN_AUDIT_ARTIFACT_ROOT || 'tmp/screenshots/responsive-audit'}/browser-temp`);
mkdirSync(temporaryDirectory, { recursive: true });
process.env.TEMP = temporaryDirectory;
process.env.TMP = temporaryDirectory;

export default defineConfig({
  ...base,
  testMatch: ['responsive-audit.spec.ts'], timeout: 900000,
  outputDir: '../../test-results/responsive-audit',
  use: { ...base.use, baseURL },
  webServer: { ...server, url: `${baseURL}/connexion`, command: 'node scripts/run-responsive-audit-server.mjs', timeout: 600000, reuseExistingServer: false, env: { ...server.env, ESCEN_AUDIT_PORT: String(port), ESCEN_BUILD_DIR: process.env.ESCEN_AUDIT_BUILD_DIR || '.next-responsive-audit', ESCEN_RESPONSIVE_AUDIT: '1', NODE_OPTIONS: '--max-old-space-size=3072', NODE_PATH: resolve('node_modules') } },
});
