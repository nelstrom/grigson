import { parseSong } from './parser/parser.js';
import { TextRenderer } from './renderers/text.js';

export class GrigsonChart extends HTMLElement {
  static get observedAttributes() {
    return ['renderer', 'transpose-key', 'transpose-semitones', 'notation-preset'];
  }

  private _root: ShadowRoot;
  private _renderer: TextRenderer;
  private _isInitialized = false;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._renderer = new TextRenderer();
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

  update() {
    const template = this.querySelector('template');
    if (!template) {
      this._root.innerHTML = '<div class="error">Error: No &lt;template&gt; found inside &lt;grigson-chart&gt;.</div>';
      return;
    }

    const content = template.innerHTML.trim();
    if (!content) {
      this._root.innerHTML = '';
      return;
    }

    const config: any = {};
    const notationPreset = this.getAttribute('notation-preset');
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

    // Update renderer instance with new config
    this._renderer = new TextRenderer(config);

    try {
      const song = parseSong(content);
      const rendered = this._renderer.render(song);
      this._root.innerHTML = `<pre>${rendered}</pre>`;
    } catch (e: any) {
      this._root.innerHTML = `<div class="error">Parse Error: ${e.message}</div>`;
    }
  }
}
