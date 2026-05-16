import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['packages/grigson/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'grigson-grille-harmonique-renderer',
              message: 'packages/grigson must not import renderer implementations.',
            },
            {
              name: 'grigson-svg-renderer',
              message: 'packages/grigson must not import renderer implementations.',
            },
            {
              name: 'grigson-text-renderer',
              message: 'packages/grigson must not import renderer implementations.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      '**/generated.js',
      '**/generated.d.ts',
      '**/dist/**',
      '**/_site/**',
      '**/node_modules/**',
    ],
  },
);
