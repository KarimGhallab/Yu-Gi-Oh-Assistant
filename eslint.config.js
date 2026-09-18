import pluginJs from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sharedRules = {
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': 'warn',
  curly: ['error', 'all']
};

export default defineConfig([
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '**/*.cjs']
  },
  pluginJs.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{mjs,cjs,ts}'],
    languageOptions: { globals: globals.node },
    rules: sharedRules
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    rules: sharedRules
  }
]);
