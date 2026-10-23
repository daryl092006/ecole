import { defineConfig } from '@playwright/test';

process.env.ESCEN_SCREENSHOT_DIR = 'tmp/screenshots/personnel-review';

export default defineConfig({
  testDir: '.',
  testMatch: ['personnel-api.spec.ts', 'personnel-dossiers.spec.ts', 'teacher-management*.spec.ts', 'crud.spec.ts', 'persistent-data.spec.ts'],
  grep: /Personnel|personnel|enseignant|profil|affectation|permission|gestionnaire|Motif|composants|séance|année close|sauvegarde|Annuler/i,
  timeout: 60000, expect: { timeout: 12000 }, workers: 1, reporter: 'list',
  outputDir: '../../test-results/personnel',
  use: { baseURL: 'http://127.0.0.1:3128', channel: 'chrome', headless: true, viewport: { width: 1440, height: 950 }, trace: 'retain-on-failure', actionTimeout: 12000 },
  webServer: {
    command: 'node scripts/run-next.mjs dev --port 3128', cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: '.next-ui-tests', ESCEN_RESPONSIVE_AUDIT: '1', WATCHPACK_POLLING: '1000' },
    url: 'http://127.0.0.1:3128/connexion', reuseExistingServer: false, timeout: 120000,
  },
});
