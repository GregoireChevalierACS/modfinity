import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Hexagonal boundaries: inner layers never import outer layers nor Node APIs. */
const forbidImports = (patterns, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }],
});

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'] },
  js.configs.recommended,
  {
    files: ['tools/**/*.ts'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['tools/*/src/domain/**/*.ts'],
    rules: forbidImports(
      ['**/application/**', '**/ports/**', '**/adapters/**', 'node:*'],
      'The domain must stay pure: no application, port, adapter or Node import.',
    ),
  },
  {
    files: ['tools/*/src/ports/**/*.ts', 'tools/*/src/application/**/*.ts'],
    rules: forbidImports(['**/adapters/**', 'node:*'], 'Ports and use cases must not depend on adapters or Node APIs.'),
  },
);
