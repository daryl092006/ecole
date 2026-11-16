import { defineConfig } from '@playwright/test';
import base from './responsive-audit.config';

const server = Array.isArray(base.webServer) ? base.webServer[0] : base.webServer;
if (!server) throw new Error('Serveur de test manquant.');
export default defineConfig({
  ...base,
  testMatch: ['teacher-management-api.spec.ts', 'teacher-management.spec.ts', 'personnel-api.spec.ts', 'personnel-dossiers.spec.ts', 'teacher-digital-access.spec.ts'],
  outputDir: '../../test-results/teacher-digital-access',
  webServer: { ...server, env: { ...server.env, ESCEN_BUILD_DIR: 'tmp/next-teacher-digital-access' } },
});
