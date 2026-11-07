import { defineConfig } from '@playwright/test';
import base from './double-degree.config';
export default defineConfig({ ...base, testMatch: ['article-editor.spec.ts', 'article-reason-api.spec.ts', 'article-layout.spec.ts'], outputDir: '../../test-results/article-editor' });
