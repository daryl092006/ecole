import { defineConfig } from '@playwright/test';
import base from './secondary-details.config';

process.env.ESCEN_RESPONSIVE_STAGE = 'after';
process.env.ESCEN_AUDIT_ARTIFACT_ROOT = 'tmp/screenshots/global-simplification';
process.env.ESCEN_AUDIT_WIDTHS = '390,820,1440';

const server = Array.isArray(base.webServer) ? base.webServer[0] : base.webServer;
if (!server) throw new Error('Serveur de test manquant.');

export default defineConfig({ ...base,
  testMatch: ['responsive-audit.spec.ts'],
  timeout: 900000,
  outputDir: '../../test-results/global-simplification-responsive',
  webServer: { ...server, command: 'node scripts/run-next.mjs start --port 3117' },
});
