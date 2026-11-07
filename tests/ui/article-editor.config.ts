import { defineConfig } from '@playwright/test';
import base from './double-degree.config';
export default defineConfig({ ...base, testMatch: ['article-editor.spec.ts'], outputDir: '../../test-results/article-editor' });
