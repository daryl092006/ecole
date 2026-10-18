import { FlatCompat } from '@eslint/eslintrc';
import { defineConfig, globalIgnores } from 'eslint/config';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = defineConfig([
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      'react/no-unescaped-entities': ['error', {
        forbid: [
          { char: '>', alternatives: ['&gt;'] },
          { char: '}', alternatives: ['&#125;'] },
        ],
      }],
    },
  },
  globalIgnores([
    '.next/**',
    '.next-verification/**',
    '.next-ui-tests/**',
    '.tmp/**',
    'test-results/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
