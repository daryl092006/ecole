import {defineConfig} from '@playwright/test';
import base from './double-degree.config';
export default defineConfig({...base,testMatch:['scholarship-award.spec.ts','scholarship-review-api.spec.ts'],outputDir:'../../test-results/scholarship-award'});
