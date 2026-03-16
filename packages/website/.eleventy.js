import fs from 'node:fs';
import path from 'node:path';
import { createHighlighter } from 'shiki';

export default async function (eleventyConfig) {
  // Initialise Shiki once and reuse across all pages
  const highlighter = await createHighlighter({
    themes: ['nord'],
    langs: [],
  });
  await highlighter.loadLanguage({
    ...JSON.parse(fs.readFileSync(
      path.join(import.meta.dirname, '../textmate-grammar/grigson.tmLanguage.json'),
      'utf8'
    )),
    name: 'grigson',
  });

  eleventyConfig.addFilter('readChart', (name) => {
    const filePath = path.join(import.meta.dirname, 'charts', `${name}.chart`);
    return fs.readFileSync(filePath, 'utf8').trim();
  });

  eleventyConfig.addAsyncFilter('highlightChart', async (name) => {
    const source = fs.readFileSync(
      path.join(import.meta.dirname, 'charts', `${name}.chart`),
      'utf8'
    ).trim();
    return highlighter.codeToHtml(source, { lang: 'grigson', theme: 'nord' });
  });

  eleventyConfig.addFilter('indexOf', (arr, page) =>
    arr.findIndex((item) => item.url === page.url)
  );

  eleventyConfig.addWatchTarget('charts/');
  eleventyConfig.addWatchTarget('../grigson/dist/');

  eleventyConfig.setServerOptions({
    headers: {
      'Cache-Control': 'no-store',
    },
  });

  eleventyConfig.addPassthroughCopy('assets');
  eleventyConfig.addPassthroughCopy({
    'node_modules/grigson/dist/grigson.iife.js': 'js/grigson.iife.js',
    'node_modules/grigson/dist/grigson-register.iife.js': 'js/grigson-register.iife.js',
    '../textmate-grammar/grigson.tmLanguage.json': 'js/grigson.tmLanguage.json',
    'node_modules/monaco-editor/min/vs': 'js/monaco/vs',
    'node_modules/vscode-oniguruma/release/onig.wasm': 'js/onig.wasm',
  });

  return {
    dir: {
      input: 'content',
      includes: '../_includes',
      output: '_site',
    },
  };
}
