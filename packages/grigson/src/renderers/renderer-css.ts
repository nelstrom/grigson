import { bravuraWoff2 } from './bravura-subset.js';
import { notoSansWoff2 } from './noto-sans-subset.js';
import { notoSerifWoff2 } from './noto-serif-subset.js';
import { notoSymbols2Woff2 } from './noto-symbols2-subset.js';
import { petalumaScriptWoff2 } from './petaluma-script-subset.js';
import { grigsonPetalumaNotationWoff2 } from './grigson-petaluma-notation-subset.js';

/**
 * Return `@font-face` declarations for the grigson bundled fonts. Inject these into the main
 * document (not a shadow root) so that browsers reliably load unicode-range sub-faces.
 */
export function getRendererFontFaceCSS(): string {
  return [
    `@font-face{font-family:"GrigsonTimeSig";src:url("${bravuraWoff2}") format("woff2");unicode-range:U+1D7CE-1D7D7,U+E500-E501;font-weight:normal;font-style:normal}`,
    `@font-face{font-family:"GrigsonSans";src:url("${notoSansWoff2}") format("woff2");unicode-range:U+0000-00FF;font-weight:100 900;font-style:normal}`,
    `@font-face{font-family:"GrigsonSans";src:url("${notoSymbols2Woff2}") format("woff2");unicode-range:U+25B3;font-weight:normal;font-style:normal}`,
    `@font-face{font-family:"GrigsonSans";src:url("${bravuraWoff2}") format("woff2");unicode-range:U+266D,U+266F;font-weight:normal;font-style:normal}`,
    `@font-face{font-family:"GrigsonSerif";src:url("${notoSerifWoff2}") format("woff2");unicode-range:U+0000-00FF;font-weight:100 900;font-style:normal}`,
    `@font-face{font-family:"GrigsonSerif";src:url("${notoSymbols2Woff2}") format("woff2");unicode-range:U+25B3;font-weight:normal;font-style:normal}`,
    `@font-face{font-family:"GrigsonSerif";src:url("${bravuraWoff2}") format("woff2");unicode-range:U+266D,U+266F;font-weight:normal;font-style:normal}`,
    `@font-face{font-family:"GrigsonNotation";src:url("${bravuraWoff2}") format("woff2");unicode-range:U+E030-E033,U+E040-E042;font-weight:normal;font-style:normal}`,
    `@font-face{font-family:"GrigsonCursive";src:url("${petalumaScriptWoff2}") format("woff2");unicode-range:U+0000-00FF,U+266D,U+266F;font-weight:normal;font-style:normal}`,
    `@font-face{font-family:"GrigsonCursive";src:url("${grigsonPetalumaNotationWoff2}") format("woff2");unicode-range:U+00F8,U+25B3,U+1D7CE-1D7D7,U+E030-E033,U+E040-E042,U+E500-E501;font-weight:normal;font-style:normal}`,
  ].join('\n');
}

/**
 * Return the CSS stylesheet required to render HTML output from `HtmlRenderer`. Pass a typeface
 * name to select a bundled font; defaults to `'sans'`.
 */
export function getRendererStyles(typeface: string = 'sans'): string {
  const defaultFamily =
    typeface === 'serif'
      ? '"GrigsonSerif", serif'
      : typeface === 'cursive'
        ? '"GrigsonCursive", cursive'
        : '"GrigsonSans", sans-serif';

  return `
      :host {
        display: block;
        color-scheme: light dark;
        font-family: var(--grigson-font-family, ${defaultFamily});
        font-size: var(--grigson-font-size, 1rem);
        color: var(--grigson-color, inherit);
        background: var(--grigson-background, transparent);
        --grigson-row-gap: 1.2em;
        --grigson-row-border-width: 0px;
        --grigson-row-border-color: currentColor;
        --grigson-section-gap: 2em;
        --grigson-barline-width: 1.5px;
        --grigson-barline-color: currentColor;
        --grigson-title-font-size: 1.4em;
        --grigson-section-label-font-size: 0.9em;
        --grigson-time-sig-font-size: 1.1em;
        --grigson-time-sig-line-height: 0.55;
        --grigson-time-sig-offset: -0.35em;
        --grigson-chord-offset: 0;
        --grigson-simile-font-size: 1.2em;
        --grigson-simile-offset: -0.3em;
        --grigson-barline-font-size: 2em;
        --grigson-barline-glyph-offset: 0.15em;
        --grigson-slash-angle: 35deg;
        --grigson-slash-chord-offset: -0.25em;
        --grigson-slash-bass-offset: 0.25em;
      }

      [data-typeface="cursive"] {
        --grigson-time-sig-font-size: 0.6em;
        --grigson-time-sig-line-height: 1.1;
        --grigson-time-sig-offset: -0.4em;
        --grigson-simile-font-size: 1.2em;
        --grigson-barline-font-size: 2em;
        --grigson-barline-glyph-offset: 0.23em;
        --grigson-chord-offset: 0.1em;
      }

      [data-typeface="serif"] {
        --grigson-simile-font-size: 1.2em;
        --grigson-barline-font-size: 2em;
      }

      [part="song-header"] {
        margin-bottom: 1em;
      }

      [part="song-title"] {
        font-family: var(--grigson-title-font-family);
        font-size: var(--grigson-title-font-size);
        font-weight: bold;
        margin: 0 0 0.2em;
      }

      [part="song-artist"],
      [part="song-key"] {
        margin: 0;
        font-size: 0.9em;
        opacity: 0.7;
      }

      [part="song-grid"] {
        display: grid;
        grid-template-columns:
          auto repeat(var(--beat-cols), minmax(var(--min-beat-width), 1fr) auto);
        row-gap: var(--grigson-row-gap);
      }

      [part="section"] {
        display: contents;
      }

      [part="section-label"] {
        grid-column: 1 / -1;
        margin-top: var(--grigson-section-gap);
        margin-bottom: 0;
        font-family: var(--grigson-section-label-font-family);
        font-size: var(--grigson-section-label-font-size);
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        opacity: 0.6;
      }

      [part="song-grid"] > [part="section-label"]:first-child {
        margin-top: 0;
      }

      [part="row"] {
        border-top: var(--grigson-row-border-width) solid var(--grigson-row-border-color);
        border-bottom: var(--grigson-row-border-width) solid var(--grigson-row-border-color);
        display: grid;
        grid-template-columns: subgrid;
        grid-template-rows: 1fr;
        align-items: center;
        line-height: 2;
      }

      [part="row"] > * {
        grid-row: 1;
      }

      [part~="barline"] {
        display: flex;
        align-items: center;
        align-self: stretch;
        position: relative;
        margin-right: 0;
      }

      [part~="bar-start"] {
        padding-left: 0.4em;
      }

      [part~="barline-position-end"] {
        justify-self: end;
        margin-right: 0;
      }

      [part~="barline-position-short-end"] {
        justify-self: center;
        margin-right: 0;
      }

      [part~="barline-position-mid"] {
        justify-self: center;
      }

      /* Single barline: thin vertical fill */
      [part~="barline-single"] {
        width: var(--grigson-barline-width);
        background: var(--grigson-barline-color);
      }

      [part~="barline-single"] [part="barline-glyph"] {
        display: none;
      }

      /* Cursive: no CSS fill, glyph shown */
      [data-typeface="cursive"] [part~="barline-single"] {
        width: auto;
        background: none;
      }

      [data-typeface="cursive"] [part~="barline-single"] [part="barline-glyph"] {
        display: flex;
      }

      [part="barline-glyph"] {
        align-self: stretch;
        display: flex;
        align-items: center;
        overflow: hidden;
        flex-shrink: 0;
      }

      [part="barline-glyph-inner"] {
        font-family: var(--grigson-barline-font-family, var(--grigson-font-family, ${defaultFamily})), "GrigsonNotation", serif;
        font-size: var(--grigson-barline-font-size);
        font-weight: normal;
        line-height: 1;
        transform: translateY(var(--grigson-barline-glyph-offset, 0.15em));
      }

      [part="barline-repeat-count"] {
        position: absolute;
        top: -1.2em;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.7em;
        white-space: nowrap;
      }

      [part~="slot"] {
        display: flex;
        align-items: baseline;
        gap: 0.15em;
        overflow: hidden;
        transform: translateY(var(--grigson-chord-offset));
      }

      [part~="dot"] {
        padding-left: 0.3em;
        opacity: 0.4;
        transform: translateY(var(--grigson-chord-offset));
      }

      [part="chord-root"] {
        font-weight: normal;
      }

      [part="chord-accidental"][data-glyph="unicode"] {
        vertical-align: super;
        line-height: 0;
        margin-left: 0.05em;
        margin-right: 0.05em;
      }

      [part="quality-accidental"][data-glyph="unicode"] {
        font-size: 1em;
        vertical-align: 0.15em;
        line-height: 0;
        margin-left: 0.05em;
        margin-right: 0.05em;
      }

      /* ── Slash chord: horizontal (default) ──────────────────────── */
      [part~="chord-slash"] {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
      }

      [part="chord-top"] {
        display: flex;
        align-items: baseline;
      }

      [part="chord-fraction-line"] {
        display: block;
        width: 100%;
        height: 1px;
        background: var(--grigson-barline-color);
      }

      [part="chord-bass"] {
        font-size: 0.85em;
      }

      /* ── Slash chord: horizontal ────────────────────────────────── */
      [part~="chord-slash"][data-slash-style="horizontal"] {
        flex-direction: column;
        align-items: center;
        gap: 1px;
      }

      [part~="chord-slash"][data-slash-style="horizontal"] [part="chord-fraction-line"] {
        display: block;
        width: 100%;
        height: 1px;
        background: var(--grigson-barline-color);
      }

      /* ── Slash chord: diagonal (Real Book style) ─────────────────── */
      [part~="chord-slash"][data-slash-style="diagonal"] {
        flex-direction: row;
        align-items: center;
        gap: 0;
      }

      [part~="chord-slash"][data-slash-style="diagonal"] [part="chord-top"] {
        align-self: flex-start;
        transform: translateY(var(--grigson-slash-chord-offset));
      }

      [part~="chord-slash"][data-slash-style="diagonal"] [part="chord-fraction-line"] {
        position: relative;
        display: inline-block;
        width: 0.5em;
        height: 1.2em;
        background: none;
        overflow: visible;
      }

      [part~="chord-slash"][data-slash-style="diagonal"] [part="chord-fraction-line"]::before {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        width: 1px;
        background: currentColor;
        transform: rotate(var(--grigson-slash-angle));
        transform-origin: center;
      }

      [part~="chord-slash"][data-slash-style="diagonal"] [part="chord-bass"] {
        align-self: flex-end;
        transform: translateY(var(--grigson-slash-bass-offset));
      }

      /* ── Slash chord: ascii ──────────────────────────────────────── */
      [part~="chord-slash"][data-slash-style="ascii"] {
        flex-direction: row;
        align-items: baseline;
        gap: 0;
      }

      [part~="chord-slash"][data-slash-style="ascii"] [part="chord-fraction-line"] {
        width: auto;
        height: auto;
        background: none;
      }

      [part~="chord-slash"][data-slash-style="ascii"] [part="chord-fraction-line"]::before {
        content: "/";
      }

      [part="time-sig"] {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        align-self: center;
        transform: translateY(var(--grigson-time-sig-offset, 0));
        font-family: var(--grigson-time-sig-font-family, var(--grigson-font-family, ${defaultFamily})), "GrigsonTimeSig", serif;
        font-size: var(--grigson-time-sig-font-size);
        font-weight: normal;
        line-height: var(--grigson-time-sig-line-height);
        flex-shrink: 0;
        padding-right: 0.2em;
      }

      [part="time-sig-num"],
      [part="time-sig-den"] {
        display: block;
      }

      [part~="simile"] {
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--grigson-simile-font-family, var(--grigson-font-family, ${defaultFamily})), "GrigsonTimeSig", serif;
        font-size: var(--grigson-simile-font-size);
        transform: translateY(var(--grigson-simile-offset));
      }
    `;
}
