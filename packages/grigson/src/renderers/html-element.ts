import type { Song } from '../parser/types.js';
import { HtmlRenderer } from './html.js';
import type { TextRendererConfig } from './text.js';
import type { GrigsonRendererElement } from './contract.js';
import { GrigsonRendererUpdateEvent } from '../events.js';

export class GrigsonHtmlRenderer extends HTMLElement implements GrigsonRendererElement {
  static get observedAttributes() {
    return ['notation-preset'];
  }

  attributeChangedCallback(_name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    this.dispatchEvent(new GrigsonRendererUpdateEvent());
  }

  private _getStyles(): string {
    return `
      :host {
        display: block;
        color-scheme: light dark;
        font-family: var(--grigson-font-family, Georgia, 'Times New Roman', serif);
        font-size: var(--grigson-font-size, 1rem);
        color: var(--grigson-color, inherit);
        background: var(--grigson-background, transparent);
        --grigson-row-gap: 1.2em;
        --grigson-section-gap: 2em;
        --grigson-barline-width: 1.5px;
        --grigson-barline-color: currentColor;
        --grigson-repeat-dot-size: 0.3em;
        --grigson-title-font-size: 1.4em;
        --grigson-section-label-font-size: 0.9em;
        --grigson-time-sig-font-size: 0.7em;
      }

      [part="song-header"] {
        margin-bottom: 1em;
      }

      [part="song-title"] {
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
        border-left: var(--grigson-barline-width) solid var(--grigson-barline-color);
        align-self: stretch;
        position: relative;
      }

      [part~="barline-double"] {
        box-shadow: 3px 0 0 var(--grigson-barline-color);
      }

      [part~="barline-final"] {
        border-left-width: calc(var(--grigson-barline-width) * 3);
        box-shadow: calc(var(--grigson-barline-width) * -3 - 2px) 0 0 var(--grigson-barline-color);
      }

      [part~="barline-startRepeat"]::after {
        content: '•\\A•';
        white-space: pre;
        font-size: var(--grigson-repeat-dot-size);
        line-height: 1.8;
        position: absolute;
        left: 4px;
      }

      [part~="barline-endRepeat"]::before {
        content: '•\\A•';
        white-space: pre;
        font-size: var(--grigson-repeat-dot-size);
        line-height: 1.8;
        position: absolute;
        right: 4px;
      }

      [part~="barline-endRepeatStartRepeat"]::before {
        content: '•\\A•';
        white-space: pre;
        font-size: var(--grigson-repeat-dot-size);
        line-height: 1.8;
        position: absolute;
        right: 4px;
      }

      [part~="barline-endRepeatStartRepeat"]::after {
        content: '•\\A•';
        white-space: pre;
        font-size: var(--grigson-repeat-dot-size);
        line-height: 1.8;
        position: absolute;
        left: 4px;
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
        font-weight: bold;
      }

      [part="chord-quality"] {
        font-size: 0.75em;
        vertical-align: 0.25em;
        line-height: 0;
      }

      [part="chord-accidental"] {
        font-size: 0.8em;
        vertical-align: 0.15em;
        line-height: 0;
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
        top: 50%;
        transform: translate(-50%, -50%);
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        font-size: var(--grigson-time-sig-font-size);
        font-weight: bold;
        line-height: 1.1;
        flex-shrink: 0;
      }

      [part="time-sig-num"],
      [part="time-sig-den"] {
        display: block;
      }
    `;
  }

  renderChart(song: Song): Element {
    const config: TextRendererConfig = {};
    const notationPreset = this.getAttribute(
      'notation-preset',
    ) as TextRendererConfig['notation'] extends { preset?: infer P } ? P : never;
    if (notationPreset) {
      config.notation = { preset: notationPreset };
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
