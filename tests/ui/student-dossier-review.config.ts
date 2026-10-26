import { defineConfig } from '@playwright/test';
import base from './secondary-details.config';

const server = Array.isArray(base.webServer) ? base.webServer[0] : base.webServer;
if (!server) throw new Error('Serveur de test manquant.');

export default defineConfig({ ...base,
  testMatch: ['student-dossier-review.spec.ts'],
  outputDir: '../../test-results/student-dossier-review',
  webServer: server,
});
