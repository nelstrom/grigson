import { parseSong } from './parser/parser.js';
import { HtmlRenderer } from './renderers/html.js';
import { type TextRendererConfig } from './renderers/text.js';

export class GrigsonChart extends HTMLElement {
  static get observedAttributes() {
    return ['renderer', 'transpose-key', 'transpose-semitones', 'notation-preset'];
  }

  private _root: ShadowRoot;
  private _isInitialized = false;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    if (this._isInitialized) {
      this.update();
    }
  }

  connectedCallback() {
    this._isInitialized = true;
    // Defer update to ensure children (template) are available
    setTimeout(() => this.update(), 0);
  }

  private _getStyles() {
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

  update() {
    const template = this.querySelector('template');
    if (!template) {
      this._root.innerHTML = `<style>${this._getStyles()}</style><div class="error">Error: No &lt;template&gt; found inside &lt;grigson-chart&gt;.</div>`;
      return;
    }

    const content = template.innerHTML.trim();
    if (!content) {
      this._root.innerHTML = '';
      return;
    }

    const config: TextRendererConfig = {};
    const notationPreset = this.getAttribute('notation-preset') as any;
    if (notationPreset) {
      config.notation = { preset: notationPreset };
    }

    const transposeKey = this.getAttribute('transpose-key');
    const transposeSemitones = this.getAttribute('transpose-semitones');
    if (transposeKey || transposeSemitones) {
      config.transpose = {};
      if (transposeKey) config.transpose.toKey = transposeKey;
      if (transposeSemitones) config.transpose.semitones = parseInt(transposeSemitones, 10);
    }

    const renderer = new HtmlRenderer(config);

    try {
      const song = parseSong(content);
      const rendered = renderer.render(song);
      this._root.innerHTML = `<style>${this._getStyles()}</style>${rendered}`;
    } catch (e: any) {
      this._root.innerHTML = `<style>${this._getStyles()}</style><div class="error">Parse Error: ${e.message}</div>`;
    }
  }
}
