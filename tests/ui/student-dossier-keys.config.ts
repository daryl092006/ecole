import { defineConfig } from '@playwright/test';
import base from './simplified-navigation.config';

export default defineConfig({ ...base,
  testMatch: ['student-dossier-keys.spec.ts'],
  outputDir: '../../test-results/student-dossier-keys',
});
