import { defineConfig } from '@playwright/test';
import base from './simplified-navigation.config';

const server = Array.isArray(base.webServer) ? base.webServer[0] : base.webServer;
if (!server) throw new Error('Serveur de test manquant.');

export default defineConfig({ ...base,
  testMatch: ['secondary-details.spec.ts', 'payment-adjustments.spec.ts', 'payment-allocations.spec.ts', 'payment-receipts.spec.ts', 'complaints.spec.ts', 'student-operations.spec.ts'],
  outputDir: '../../test-results/secondary-details',
  webServer: { ...server, command: 'node scripts/run-responsive-audit-server.mjs', reuseExistingServer: false, timeout: 600000,
    env: { ...server.env, ESCEN_BUILD_DIR: '.next-secondary-details', ESCEN_RESPONSIVE_AUDIT: '1', NODE_OPTIONS: '--max-old-space-size=3072' } },
});
