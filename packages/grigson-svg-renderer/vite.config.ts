import { defineConfig } from 'vite';
import { resolve } from 'path';

const isRegister = process.env.VITE_BUILD_REGISTER === 'true';

export default defineConfig({
  build: {
    lib: {
      entry: isRegister
        ? resolve(__dirname, 'src/register.ts')
        : resolve(__dirname, 'src/index.browser.ts'),
      name: isRegister ? 'grigsonSvgRendererRegister' : 'grigsonSvgRenderer',
      fileName: (format) => {
        const base = isRegister ? 'grigson-svg-renderer-register' : 'grigson-svg-renderer';
        return format === 'es' ? `${base}.esm.js` : `${base}.iife.js`;
      },
      formats: ['iife', 'es'],
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
});
