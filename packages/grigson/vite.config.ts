import { defineConfig } from 'vite';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

const isRegister = process.env.VITE_BUILD_REGISTER === 'true';
const isVisualize = process.env.VITE_VISUALIZE === 'true';

export default defineConfig({
  build: {
    lib: {
      entry: isRegister
        ? resolve(__dirname, 'src/register.ts')
        : resolve(__dirname, 'src/index.browser.ts'),
      name: isRegister ? 'grigsonRegister' : 'grigson',
      fileName: (format) => {
        const base = isRegister ? 'grigson-register' : 'grigson';
        return format === 'es' ? `${base}.esm.js` : `${base}.iife.js`;
      },
      formats: ['iife', 'es'],
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
  plugins: isVisualize
    ? [visualizer({ open: true, filename: 'dist/stats.html', gzipSize: true, brotliSize: true })]
    : [],
});
