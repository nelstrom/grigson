import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['src/parser/generated.js', 'src/parser/generated.d.ts', 'dist/**'],
  },
);
