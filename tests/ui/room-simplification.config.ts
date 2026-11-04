import { defineConfig } from '@playwright/test';

// Uses the running development server, without starting a second Next build.
export default defineConfig({
  testDir: '.',
  testMatch: ['business-processes.spec.ts', 'schedule-management.spec.ts'],
  grep: /Les prérequis conduisent|Calendrier de récurrence.*390px/,
  timeout: 60000, expect: { timeout: 12000 }, workers: 1, reporter: 'list',
  outputDir: '../../test-results/room-simplification',
  use: { baseURL: process.env.ESCEN_ROOM_UI_URL || 'http://127.0.0.1:3000',
    channel: 'chrome', headless: true, trace: 'off', actionTimeout: 12000 },
});
