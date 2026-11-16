import { defineConfig } from '@playwright/test';
import base from './responsive-audit.config';
const server = Array.isArray(base.webServer) ? base.webServer[0] : base.webServer;
if (!server) throw new Error('Serveur de test absent.');
export default defineConfig({ ...base,
  testMatch: ['schedule-management-api.spec.ts', 'schedule-management.spec.ts', 'teacher-digital-access.spec.ts'],
  outputDir: '../../test-results/schedule-teacher-contact',
  webServer: { ...server, env: { ...server.env, ESCEN_BUILD_DIR: 'tmp/next-schedule-teacher-contact' } },
});
