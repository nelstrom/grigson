import { defineConfig } from 'vite';
import { resolve } from 'path';

const isRegister = process.env.VITE_BUILD_REGISTER === 'true';

export default defineConfig({
  build: {
    lib: {
      entry: isRegister
        ? resolve(__dirname, 'src/register.ts')
        : resolve(__dirname, 'src/index.browser.ts'),
      name: isRegister ? 'grigsonTextRendererRegister' : 'grigsonTextRenderer',
      fileName: (format) => {
        const base = isRegister ? 'grigson-text-renderer-register' : 'grigson-text-renderer';
        return format === 'es' ? `${base}.esm.js` : `${base}.iife.js`;
      },
      formats: ['iife', 'es'],
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
});
