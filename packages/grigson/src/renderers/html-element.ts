import type { Song } from '../parser/types.js';
import { HtmlRenderer } from './html.js';
import type { TextRendererConfig } from './text.js';
import type { GrigsonRendererElement } from './contract.js';
import { GrigsonRendererUpdateEvent } from '../events.js';
import { bravuraWoff2 } from './bravura-subset.js';
import { notoSansWoff2 } from './noto-sans-subset.js';
import { notoSerifWoff2 } from './noto-serif-subset.js';
import { notoSymbols2Woff2 } from './noto-symbols2-subset.js';
import { petalumaScriptWoff2 } from './petaluma-script-subset.js';
import { grigsonPetalumaTimeSigWoff2 } from './grigson-petaluma-timesig-subset.js';

export class GrigsonHtmlRenderer extends HTMLElement implements GrigsonRendererElement {
  static get observedAttributes() {
    return ['notation-preset', 'simile-output', 'typeface', 'accidentals'];
  }

  attributeChangedCallback(_name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    this.dispatchEvent(new GrigsonRendererUpdateEvent());
  }

  private _ensureFontFaces(): void {
    // GrigsonTimeSig — Bravura subset covering only Math Bold digits U+1D7CE–1D7D7.
    // Registered as a named fallback so system fonts (e.g. Cambria Math) cannot win
    // for those codepoints when --grigson-font-family is set to a custom font.
    const timeSigId = 'grigson-time-sig-font-face';
    if (!document.getElementById(timeSigId)) {
      const style = document.createElement('style');
      style.id = timeSigId;
      style.textContent = `@font-face{font-family:"GrigsonTimeSig";src:url("${bravuraWoff2}") format("woff2");unicode-range:U+1D7CE-1D7D7;font-weight:normal;font-style:normal}`;
      document.head.appendChild(style);
    }

    // GrigsonSans and GrigsonSerif composite families.  Both are always
    // injected so switching typeface via the attribute only requires a CSS
    // font-family change.  Each family composes three unicode-range blocks:
    //   • Latin-1 (U+0000–00FF) from the appropriate Noto variant
    //   • △ (U+25B3) from Noto Sans Symbols 2 (geometric, typeface-agnostic)
    //   • ♭♯ (U+266D, U+266F) from Bravura
    const notoId = 'grigson-noto-font-faces';
    if (!document.getElementById(notoId)) {
      const style = document.createElement('style');
      style.id = notoId;
      style.textContent = [
        `@font-face{font-family:"GrigsonSans";src:url("${notoSansWoff2}") format("woff2");unicode-range:U+0000-00FF;font-weight:100 900;font-style:normal}`,
        `@font-face{font-family:"GrigsonSans";src:url("${notoSymbols2Woff2}") format("woff2");unicode-range:U+25B3;font-weight:normal;font-style:normal}`,
        `@font-face{font-family:"GrigsonSans";src:url("${bravuraWoff2}") format("woff2");unicode-range:U+266D,U+266F;font-weight:normal;font-style:normal}`,
        `@font-face{font-family:"GrigsonSerif";src:url("${notoSerifWoff2}") format("woff2");unicode-range:U+0000-00FF;font-weight:100 900;font-style:normal}`,
        `@font-face{font-family:"GrigsonSerif";src:url("${notoSymbols2Woff2}") format("woff2");unicode-range:U+25B3;font-weight:normal;font-style:normal}`,
        `@font-face{font-family:"GrigsonSerif";src:url("${bravuraWoff2}") format("woff2");unicode-range:U+266D,U+266F;font-weight:normal;font-style:normal}`,
      ].join('\n');
      document.head.appendChild(style);
    }

    // GrigsonCursive — PetalumaScript, a handwritten Real Book-style typeface.
    // Uses NotoSansSymbols2 for △ (U+25B3) which PetalumaScript does not include.
    // PetalumaScript has ♭♯ at standard Unicode positions so no Bravura fallback is needed.
    const jazzId = 'grigson-jazz-font-faces';
    if (!document.getElementById(jazzId)) {
      const style = document.createElement('style');
      style.id = jazzId;
      style.textContent = [
        `@font-face{font-family:"GrigsonCursive";src:url("${petalumaScriptWoff2}") format("woff2");unicode-range:U+0000-00FF,U+266D,U+266F;font-weight:normal;font-style:normal}`,
        `@font-face{font-family:"GrigsonCursive";src:url("${notoSymbols2Woff2}") format("woff2");unicode-range:U+25B3;font-weight:normal;font-style:normal}`,
        `@font-face{font-family:"GrigsonCursive";src:url("${grigsonPetalumaTimeSigWoff2}") format("woff2");unicode-range:U+1D7CE-1D7D7;font-weight:normal;font-style:normal}`,
      ].join('\n');
      document.head.appendChild(style);
    }
  }

  private _getStyles(): string {
    const typeface = this.getAttribute('typeface') ?? 'sans';
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
        --grigson-section-gap: 2em;
        --grigson-barline-width: 1.5px;
        --grigson-barline-color: currentColor;
        --grigson-title-font-size: 1.4em;
        --grigson-section-label-font-size: 0.9em;
        --grigson-time-sig-font-size: 1.1em;
        --grigson-time-sig-line-height: 0.55;
        --grigson-time-sig-top: 50%;
      }

      :host([typeface="cursive"]) {
        --grigson-time-sig-font-size: 1.1em;
        --grigson-time-sig-line-height: 0.55;
        --grigson-time-sig-top: 50%;
      }

      :host([typeface="serif"]) {
        --grigson-time-sig-font-size: 1.1em;
        --grigson-time-sig-line-height: 0.55;
        --grigson-time-sig-top: 50%;
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
          repeat(var(--beat-cols), minmax(var(--min-beat-width), 1fr))
          0fr;
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
        grid-column: 1 / -1;
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
        width: 0;
        align-self: stretch;
        position: relative;
      }

      /* Single barline: plain CSS border */
      [part~="barline-single"] {
        border-left: var(--grigson-barline-width) solid var(--grigson-barline-color);
      }

      /* SVG barlines: absolutely positioned within the zero-width span.
         Fixed 2em height keeps dot sizes and line weights stable regardless of
         row height — tall rows (e.g. slash chords) don't blow up the symbols.
         The SVG is centred vertically; on rows shorter than 2em it overflows
         slightly (intentionally "taller than ideal", cropped by the row gap). */
      [part~="barline"] svg {
        position: absolute;
        height: 2em;
        width: auto;
        top: 50%;
      }

      /* startRepeat: thick bar's left edge at column boundary, dots extend right */
      [part~="barline-startRepeat"] svg {
        left: 0;
        transform: translateY(-50%);
      }

      /* double: centred on column boundary so neither thin line overflows the grid */
      /* final, endRepeat: right-anchored so the thick bar ends at the column boundary */
      [part~="barline-double"] svg,
      [part~="barline-final"] svg,
      [part~="barline-endRepeat"] svg {
        right: 0;
        transform: translateY(-50%);
      }

      /* Centred: thick bar centred on the column boundary */
      [part~="barline-endRepeatStartRepeat"] svg {
        left: 0;
        transform: translate(-50%, -50%);
      }

      [part="barline-repeat-count"] {
        position: absolute;
        top: -1.2em;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.7em;
        white-space: nowrap;
      }

      [part="slot"] {
        position: relative;
        display: flex;
        align-items: baseline;
        gap: 0.15em;
        overflow: hidden;
      }

      [part~="barline"] + [part="slot"] {
        padding-left: 1em;
      }

      [part="dot"] {
        padding-left: 0.3em;
        opacity: 0.4;
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

      [part="chord-slash"] {
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
        width: 100%;
        height: 1px;
        background: var(--grigson-barline-color);
      }

      [part="chord-bass"] {
        font-size: 0.85em;
      }

      [part="time-sig"] {
        position: absolute;
        left: 0.75em;
        top: var(--grigson-time-sig-top);
        transform: translate(-50%, -50%);
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        font-family: var(--grigson-time-sig-font-family, var(--grigson-font-family, ${defaultFamily})), "GrigsonTimeSig", serif;
        font-size: var(--grigson-time-sig-font-size);
        font-weight: normal;
        line-height: var(--grigson-time-sig-line-height);
        flex-shrink: 0;
      }

      [part="time-sig-num"],
      [part="time-sig-den"] {
        display: block;
      }

      [part="simile"] {
        display: flex;
        align-items: center;
        justify-content: center;
        padding-left: 1em;
      }

      [part="simile"] svg {
        height: 1.2em;
        width: 1.2em;
      }
    `;
  }

  renderChart(song: Song): Element {
    this._ensureFontFaces();
    const config: TextRendererConfig = {};
    const notationPreset = this.getAttribute(
      'notation-preset',
    ) as TextRendererConfig['notation'] extends { preset?: infer P } ? P : never;
    if (notationPreset) {
      config.notation = { preset: notationPreset };
    }
    const simileOutput = this.getAttribute('simile-output');
    if (simileOutput === 'shorthand' || simileOutput === 'longhand') {
      config.simile = { output: simileOutput };
    }
    const accidentals = this.getAttribute('accidentals');
    if (accidentals === 'ascii' || accidentals === 'unicode') {
      config.accidentals = accidentals;
    }

    const renderer = new HtmlRenderer(config);
    const html = renderer.render(song);

    const wrapper = document.createElement('div');
    if (typeof wrapper.setHTMLUnsafe === 'function') {
      wrapper.setHTMLUnsafe(`<style>${this._getStyles()}</style>${html}`);
    } else {
      wrapper.innerHTML = `<style>${this._getStyles()}</style>${html}`;
    }
    return wrapper;
  }
}
