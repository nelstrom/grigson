import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  ignores: [
    '**/generated.js',
    '**/generated.d.ts',
    '**/dist/**',
    '**/_site/**',
    '**/node_modules/**',
  ],
});
