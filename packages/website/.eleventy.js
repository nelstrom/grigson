import fs from 'node:fs';
import path from 'node:path';
import { createHighlighter } from 'shiki';
import {
  parseSong,
  normaliseSong,
  HtmlRenderer,
  getRendererStyles,
  getRendererFontFaceCSS,
} from 'grigson';
import grigsonPlugin from 'eleventy-plugin-grigson';

// Precompute once — font data URIs are large
const fontFaceCSS = getRendererFontFaceCSS();
const defaultStyles = getRendererStyles('sans');

export default async function (eleventyConfig) {
  // Initialise Shiki once and reuse across all pages
  const highlighter = await createHighlighter({
    themes: ['nord', 'github-light'],
    langs: ['html', 'css', 'javascript', 'typescript', 'shellscript'],
  });
  await highlighter.loadLanguage({
    ...JSON.parse(
      fs.readFileSync(
        path.join(import.meta.dirname, '../textmate-grammar/grigson.tmLanguage.json'),
        'utf8',
      ),
    ),
    name: 'grigson',
  });

  eleventyConfig.addFilter('readChart', (name) => {
    const filePath = path.join(import.meta.dirname, 'charts', `${name}.chart`);
    return fs.readFileSync(filePath, 'utf8').trim();
  });

  const shikiOptions = {
    themes: { light: 'github-light', dark: 'nord' },
    defaultColor: 'light',
  };

  eleventyConfig.addAsyncFilter('highlightChart', async (name) => {
    const source = fs
      .readFileSync(path.join(import.meta.dirname, 'charts', `${name}.chart`), 'utf8')
      .trim();
    return highlighter.codeToHtml(source, { lang: 'grigson', ...shikiOptions });
  });

  eleventyConfig.addPairedShortcode('highlight', (code, language) => {
    return highlighter.codeToHtml(code.trim(), { lang: language, ...shikiOptions });
  });

  eleventyConfig.addPairedShortcode('grigsonChartDSD', (source, normalise = true) => {
    let song = parseSong(source.trim());
    if (normalise) song = normaliseSong(song);
    const chartHTML = new HtmlRenderer().render(song);
    const attrs = normalise ? ' normalise' : '';
    // Font-face declarations go in the main document (not the shadow root) so that
    // browsers reliably load the unicode-range sub-faces.  Component styles go
    // inside the shadow root where they belong.
    return [
      `<style data-grigson-fonts>${fontFaceCSS}</style>`,
      `<grigson-chart${attrs}>`,
      `  <template shadowrootmode="open">`,
      `    <style>${defaultStyles}</style>`,
      `    ${chartHTML}`,
      `  </template>`,
      `  <template>${source.trim()}</template>`,
      `</grigson-chart>`,
    ].join('\n');
  });

  eleventyConfig.amendLibrary('md', (md) => {
    md.options.highlight = (code, lang) => {
      const language = highlighter.getLoadedLanguages().includes(lang) ? lang : 'plain';
      return highlighter.codeToHtml(code, { lang: language, ...shikiOptions });
    };
  });

  eleventyConfig.addPlugin(grigsonPlugin);

  eleventyConfig.addFilter('indexOf', (arr, page) =>
    arr.findIndex((item) => item.url === page.url),
  );

  eleventyConfig.addFilter('startsWith', (str, prefix) => str?.startsWith(prefix) ?? false);

  eleventyConfig.addWatchTarget('charts/');
  eleventyConfig.addWatchTarget('../grigson/dist/');
  eleventyConfig.addWatchTarget('content/_data/typedoc-output.json');

  eleventyConfig.setServerOptions({
    headers: {
      'Cache-Control': 'no-store',
    },
  });

  // When deploying under a path prefix (e.g. /grigson/ on GitHub Pages), Eleventy's
  // `url` filter handles template expressions but leaves raw markdown links and inline
  // HTML untouched.  This transform rewrites every href/src that starts with "/" but
  // does not already carry the prefix so all links resolve correctly.
  const pathPrefix = process.env.ELEVENTY_PATH_PREFIX ?? '/';
  if (pathPrefix !== '/') {
    const prefix = pathPrefix.replace(/\/$/, ''); // strip trailing slash → "/grigson"
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(href|src)="(?!${escaped})/`, 'g');
    eleventyConfig.addTransform('pathPrefix', (content, outputPath) => {
      if (!outputPath?.endsWith('.html')) return content;
      return content.replace(re, `$1="${prefix}/`);
    });
  }

  eleventyConfig.addPassthroughCopy('assets');
  eleventyConfig.addPassthroughCopy({
    'node_modules/grigson/dist/grigson.iife.js': 'js/grigson.iife.js',
    'node_modules/grigson/dist/grigson-register.iife.js': 'js/grigson-register.iife.js',
    'node_modules/grigson/dist/grigson-cdn-register.iife.js': 'js/grigson-cdn-register.iife.js',
    'node_modules/grigson-text-renderer/dist/grigson-text-renderer-register.iife.js':
      'js/grigson-text-renderer-register.iife.js',
    '../textmate-grammar/grigson.tmLanguage.json': 'js/grigson.tmLanguage.json',
    'node_modules/monaco-editor/min/vs': 'js/monaco/vs',
    'node_modules/vscode-oniguruma/release/onig.wasm': 'js/onig.wasm',
    'node_modules/lz-string/libs/lz-string.min.js': 'js/lz-string.min.js',
    'node_modules/json-formatter-js/dist/json-formatter.umd.js': 'js/json-formatter.umd.js',
    'node_modules/json-formatter-js/dist/json-formatter.css': 'js/json-formatter.css',
  });

  return {
    pathPrefix: process.env.ELEVENTY_PATH_PREFIX ?? '/',
    dir: {
      input: 'content',
      includes: '../_includes',
      output: '_site',
    },
  };
}
