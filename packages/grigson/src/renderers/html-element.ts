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
        font-family: var(--grigson-font-family, monospace);
        color: var(--grigson-color, inherit);
        background: var(--grigson-background, transparent);
        line-height: var(--grigson-line-height, 1.5);
        --grigson-barline-color: var(--grigson-color, inherit);
        --grigson-chord-root-color: var(--grigson-color, inherit);
        --grigson-chord-suffix-color: var(--grigson-color, inherit);
        --grigson-frontmatter-color: #888;
      }

      @media (prefers-color-scheme: dark) {
        :host {
          --grigson-frontmatter-color: #aaa;
        }
      }

      [part="song"] {
        white-space: pre-wrap;
      }

      [part="frontmatter"] {
        color: var(--grigson-frontmatter-color);
        margin-bottom: 1em;
      }

      [part="row"] {
        margin-bottom: 0.5em;
      }

      [part="barline"] {
        color: var(--grigson-barline-color);
        font-weight: bold;
      }

      [part="chord-root"] {
        color: var(--grigson-chord-root-color);
        font-weight: bold;
      }

      [part="chord-suffix"] {
        color: var(--grigson-chord-suffix-color);
      }
    `;
  }

  renderChart(song: Song): Element {
    const config: TextRendererConfig = {};
    const notationPreset = this.getAttribute('notation-preset') as TextRendererConfig['notation'] extends { preset?: infer P } ? P : never;
    if (notationPreset) {
      config.notation = { preset: notationPreset };
    }

    const renderer = new HtmlRenderer(config);
    const html = renderer.render(song);

    const wrapper = document.createElement('div');
    wrapper.setHTMLUnsafe(`<style>${this._getStyles()}</style>${html}`);
    return wrapper;
  }
}
