import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environmentMatchGlobs: [['src/element.test.ts', 'happy-dom']],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*-cdn.ts',
        'src/**/*-subset.ts',
        'src/html-renderer-cli.ts',
        'src/run-renderer.ts',
      ],
    },
  },
});
