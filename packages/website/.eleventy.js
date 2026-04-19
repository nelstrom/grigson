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

      // Resolve source — prefer inline template, fall back to external template reference
      const inlineTmpl = chart.querySelector('template:not([shadowrootmode])');
      let source;
      if (inlineTmpl) {
        source = inlineTmpl.innerHTML.trim();
      } else {
        const refId = chart.getAttribute('template');
        if (refId) {
          const ext = document.getElementById(refId);
          if (ext) source = ext.innerHTML.trim();
        }
      }
      if (!source) continue;

      // Classify children: skip charts with unknown renderer children we can't replicate
      const children = Array.from(chart.children);
      const hasUnknownChildren = children.some(
        (c) =>
          c.tagName !== 'TEMPLATE' &&
          c.tagName !== 'STYLE' &&
          c.tagName !== 'GRIGSON-HTML-RENDERER',
      );
      if (hasUnknownChildren) continue;

      const htmlRenderers = children.filter((c) => c.tagName === 'GRIGSON-HTML-RENDERER');
      const userStyles = children.filter((c) => c.tagName === 'STYLE');

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

        let shadowContent;

        if (htmlRenderers.length === 0) {
          // Implicit renderer
          const chartHTML = new HtmlRenderer().render(song);
          shadowContent = `<style>${defaultStyles}</style>${chartHTML}`;
        } else {
          // Explicit grigson-html-renderer children — replicate renderChart() output structure
          const parts = userStyles.map((s) => `<style>${s.textContent}</style>`);

          for (const rendererEl of htmlRenderers) {
            const config = {};
            const notationPreset = rendererEl.getAttribute('notation-preset');
            if (notationPreset) config.notation = { preset: notationPreset };
            const simileOutput = rendererEl.getAttribute('simile-output');
            if (simileOutput === 'shorthand' || simileOutput === 'longhand')
              config.simile = { output: simileOutput };
            const accidentals = rendererEl.getAttribute('accidentals');
            if (accidentals === 'ascii' || accidentals === 'unicode')
              config.accidentals = accidentals;
            const slashStyle = rendererEl.getAttribute('slash-style');
            if (slashStyle === 'horizontal' || slashStyle === 'diagonal' || slashStyle === 'ascii')
              config.slashStyle = slashStyle;
            const barsPerLine = parseInt(rendererEl.getAttribute('bars-per-line') ?? '', 10);
            if (barsPerLine > 0) config.barsPerLine = barsPerLine;
            const maxBarsPerLine = parseInt(rendererEl.getAttribute('max-bars-per-line') ?? '', 10);
            if (maxBarsPerLine > 0) config.maxBarsPerLine = maxBarsPerLine;

            const typeface = rendererEl.getAttribute('typeface') ?? 'sans';
            const styles = getRendererStyles(typeface);
            const html = new HtmlRenderer(config).render(song);

            let rendered = `<div data-typeface="${typeface}"><style>${styles}</style>${html}</div>`;
            const cls = rendererEl.getAttribute('class');
            if (cls) rendered = `<div class="${cls}">${rendered}</div>`;
            parts.push(rendered);
          }

          shadowContent = parts.join('');
        }

        // The host style is normally injected by the element constructor (JS).
        // Include it in the DSD so container queries work without JS too.
        const hostStyle = '<style>:host{display:block;container-type:inline-size}</style>';
        chart.insertAdjacentHTML(
          'afterbegin',
          `<template shadowrootmode="open">${hostStyle}${shadowContent}</template>`,
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
