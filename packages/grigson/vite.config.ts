import { defineConfig } from 'vite';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

const isRegister = process.env.VITE_BUILD_REGISTER === 'true';
const isCdn = process.env.VITE_FONTS === 'cdn';
const isVisualize = process.env.VITE_VISUALIZE === 'true';

export default defineConfig({
  resolve: {
    alias: isCdn
      ? {
          './noto-sans-subset.js': resolve(__dirname, 'src/renderers/noto-sans-cdn.ts'),
          './noto-serif-subset.js': resolve(__dirname, 'src/renderers/noto-serif-cdn.ts'),
          './noto-symbols2-subset.js': resolve(__dirname, 'src/renderers/noto-symbols2-cdn.ts'),
          './bravura-subset.js': resolve(__dirname, 'src/renderers/bravura-cdn.ts'),
          './petaluma-script-subset.js': resolve(__dirname, 'src/renderers/petaluma-script-cdn.ts'),
        }
      : {},
  },
  build: {
    lib: {
      entry: isRegister
        ? resolve(__dirname, 'src/register.ts')
        : resolve(__dirname, 'src/index.browser.ts'),
      name: isRegister ? 'grigsonRegister' : 'grigson',
      fileName: (format) => {
        const base = isRegister
          ? isCdn
            ? 'grigson-cdn-register'
            : 'grigson-register'
          : isCdn
            ? 'grigson-cdn'
            : 'grigson';
        return format === 'es' ? `${base}.esm.js` : `${base}.iife.js`;
      },
      formats: ['iife', 'es'],
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
  plugins: isVisualize
    ? [
        visualizer({
          open: true,
          filename: `dist/stats${isCdn ? '-cdn' : ''}.html`,
          gzipSize: true,
          brotliSize: true,
        }),
      ]
    : [],
});
