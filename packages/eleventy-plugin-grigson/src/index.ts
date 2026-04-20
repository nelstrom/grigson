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

const fontFaceCSS = getRendererFontFaceCSS();
const defaultStyles = getRendererStyles('sans');
const hostStyle = '<style>:host{display:block;container-type:inline-size}</style>';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function grigsonPlugin(eleventyConfig: any): void {
  eleventyConfig.addTransform('grigson-dsd', async function (content: string, outputPath: string) {
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
      const children = Array.from(chart.children) as Element[];
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
            const config: Record<string, unknown> = {};
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
}

export default grigsonPlugin;
