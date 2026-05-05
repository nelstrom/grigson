import { defineConfig } from 'vite';
import { resolve } from 'path';

const isRegister = process.env.VITE_BUILD_REGISTER === 'true';

export default defineConfig({
  build: {
    lib: {
      entry: isRegister
        ? resolve(__dirname, 'src/register.ts')
        : resolve(__dirname, 'src/index.browser.ts'),
      name: isRegister
        ? 'grigsonGrilleHarmoniqueRendererRegister'
        : 'grigsonGrilleHarmoniqueRenderer',
      fileName: (format) => {
        const base = isRegister
          ? 'grigson-grille-harmonique-renderer-register'
          : 'grigson-grille-harmonique-renderer';
        return format === 'es' ? `${base}.esm.js` : `${base}.iife.js`;
      },
      formats: ['iife', 'es'],
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
});
