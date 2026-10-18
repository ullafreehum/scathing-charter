import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'android', 'node_modules', 'test-results', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ['src/engine/**/*.ts'],
    rules: { 'no-restricted-properties': ['error',
      { object: 'Math', property: 'random', message: 'Use engine/rng.ts (determinism).' },
      { object: 'Date', property: 'now', message: 'The engine must not read the clock.' }] },
  },
);
