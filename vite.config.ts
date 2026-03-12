import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.browser.ts'),
      name: 'grigson',
      fileName: (format) => (format === 'es' ? 'grigson.esm.js' : `grigson.${format}.js`),
      formats: ['iife', 'es'],
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
});
