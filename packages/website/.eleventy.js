import fs from 'node:fs';
import path from 'node:path';
import { createHighlighter } from 'shiki';
import { parseHTML } from 'linkedom';
import {
  parseSong,
  normaliseSong,
  transposeSong,
  transposeSongToKey,
  HtmlRenderer,
  getRendererStyles,
  getRendererFontFaceCSS,
} from 'grigson';

// Precompute once — font data URIs are large
const fontFaceCSS = getRendererFontFaceCSS();
const defaultStyles = getRendererStyles('sans');

export default async function (eleventyConfig) {
  // Initialise Shiki once and reuse across all pages
  const highlighter = await createHighlighter({
    themes: ['nord', 'github-light'],
    langs: ['html', 'css'],
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

  eleventyConfig.addTransform('grigson-dsd', async function (content, outputPath) {
    if (!outputPath?.endsWith('.html')) return content;

    const { document } = parseHTML(content);
    const charts = document.querySelectorAll('grigson-chart');
    if (charts.length === 0) return content;

    let anyProcessed = false;

    for (const chart of charts) {
      if (chart.querySelector('template[shadowrootmode]')) continue; // already has DSD
      if (chart.hasAttribute('template')) continue; // external template ref — skip
      if (chart.querySelector('grigson-html-renderer')) continue; // custom renderer — skip

      const inlineTmpl = chart.querySelector('template:not([shadowrootmode])');
      if (!inlineTmpl) continue;
      const source = inlineTmpl.innerHTML.trim();
      if (!source) continue;

      try {
        let song = parseSong(source);
        if (chart.hasAttribute('normalise')) song = normaliseSong(song);
        const transposeKey = chart.getAttribute('transpose-key');
        const semitoneAttr = chart.getAttribute('transpose-semitones');
        if (transposeKey) {
          song = transposeSongToKey(song, transposeKey);
        } else if (semitoneAttr !== null) {
          const n = parseInt(semitoneAttr, 10);
          if (!isNaN(n)) song = transposeSong(song, n);
        }

        const chartHTML = new HtmlRenderer().render(song);
        chart.insertAdjacentHTML(
          'afterbegin',
          `<template shadowrootmode="open"><style>${defaultStyles}</style>${chartHTML}</template>`,
        );
        anyProcessed = true;
      } catch (err) {
        console.warn(
          `[grigson-dsd] Skipping chart on ${outputPath}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (anyProcessed && !document.querySelector('style[data-grigson-fonts]')) {
      document
        .querySelector('head')
        ?.insertAdjacentHTML('beforeend', `<style data-grigson-fonts>${fontFaceCSS}</style>`);
    }

    return document.toString();
  });

  eleventyConfig.addFilter('indexOf', (arr, page) =>
    arr.findIndex((item) => item.url === page.url),
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
    'node_modules/grigson/dist/grigson-cdn-register.iife.js': 'js/grigson-cdn-register.iife.js',
    'node_modules/grigson-text-renderer/dist/grigson-text-renderer-register.iife.js':
      'js/grigson-text-renderer-register.iife.js',
    '../textmate-grammar/grigson.tmLanguage.json': 'js/grigson.tmLanguage.json',
    'node_modules/monaco-editor/min/vs': 'js/monaco/vs',
    'node_modules/vscode-oniguruma/release/onig.wasm': 'js/onig.wasm',
    'node_modules/lz-string/libs/lz-string.min.js': 'js/lz-string.min.js',
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
