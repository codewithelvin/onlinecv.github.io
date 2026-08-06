import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Test files may use dev-time globals.
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    /**
     * Build-time tooling: `scripts/` (thumbnails, the social card) and the
     * locale-pages plugin. Node globals, and no `react-refresh` rule — these
     * modules export functions, not components.
     *
     * ⚠️ `scripts/` is deliberately OUTSIDE `tsc -b`: it is run with `vite-node`,
     * which transpiles without checking, and type-checking it would mean adding
     * `@types/node` — a dependency §27 requires approval for, bought for tooling
     * that never ships. ESLint is the only gate on these files; keep them simple.
     */
    files: ['scripts/**/*.ts', 'vite-plugin-locale-pages.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
);
