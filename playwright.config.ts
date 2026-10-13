import { defineConfig } from '@playwright/test';
const development = process.env.ESCEN_UI_DEV === '1';
export default defineConfig({
  testDir: './tests/ui',
  timeout: 90000,
  expect: { timeout: 10000 },
  workers: 1,
  reporter: 'list',
  outputDir: '.tmp/ui-results',
  use: { baseURL: 'http://127.0.0.1:3105', channel: process.env.ESCEN_BROWSER_CHANNEL || 'chrome', headless: true, actionTimeout: 15000, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: development ? 'npm run dev -- --port 3105' : 'npm run start -- --port 3105', url: 'http://127.0.0.1:3105', env: { ESCEN_BUILD_DIR: development ? '.tmp/next-ui-development' : '.next-verification' }, reuseExistingServer: !process.env.CI, timeout: 120000 },
});
