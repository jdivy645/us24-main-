import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Repository lint rules — 11 §20, 16 §20.
 *
 * Beyond the standard recommended sets, the custom rules below make three spec
 * invariants mechanically enforceable rather than review-dependent:
 *   - no `dangerouslySetInnerHTML` (11 §11, §18: source text is rendered as text)
 *   - no browser storage of case data (11 §6, §18, 15 §20)
 *   - no `console` in shipped code paths (12 §19: logs go through the logger)
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/.private-storage/**',
      '**/coverage/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      eqeqeq: ['error', 'smart'],
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // 11 §6 / §18 / 15 §20: no PHI-bearing browser storage, anywhere.
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            'Case, transcript and patient data must never be stored in the browser (11 §18, 15 §20). Use server-side state.',
        },
        {
          name: 'sessionStorage',
          message:
            'Case, transcript and patient data must never be stored in the browser (11 §18, 15 §20).',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'localStorage',
          message: 'Sensitive data must not be persisted to browser storage (11 §18).',
        },
        {
          object: 'window',
          property: 'sessionStorage',
          message: 'Sensitive data must not be persisted to browser storage (11 §18).',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          // 11 §11: "Avoid injecting transcript HTML; render source text as text."
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message:
            'Source text is untrusted and must be rendered as text, never as HTML (11 §11, 11 §18, 08 §21).',
        },
      ],
    },
  },

  {
    files: ['apps/web/**/*.tsx', 'packages/ui/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  {
    // Migration, seed and E2E scripts report to the console by design.
    files: [
      'apps/api/src/db/migrate.ts',
      'apps/api/src/services/seed.ts',
      'apps/api/src/index.ts',
      'e2e/**/*.ts',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    // The end-to-end suite READS browser storage in order to prove it is empty
    // (15 §20: "No localStorage PHI"). That is the one legitimate use.
    files: ['e2e/**/*.ts'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
);
