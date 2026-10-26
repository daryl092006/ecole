import { defineConfig } from '@playwright/test';
import base from './attendance-management.config';

const server = Array.isArray(base.webServer) ? base.webServer[0] : base.webServer;
if (!server) throw new Error('Serveur de test manquant.');

export default defineConfig({
  ...base,
  testMatch: ['simplified-navigation.spec.ts', 'personal-exams-navigation.spec.ts'],
  outputDir: '../../test-results/simplified-navigation',
  webServer: { ...server, env: { ...server.env, WATCHPACK_POLLING: 'true' } },
});
