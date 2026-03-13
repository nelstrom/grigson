import { parseSong } from './parser/parser.js';
import { TextRenderer } from './renderers/text.js';

export class GrigsonChart extends HTMLElement {
  private _root: ShadowRoot;
  private _renderer: TextRenderer;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._renderer = new TextRenderer();
  }

  connectedCallback() {
    // Defer update to next task to ensure children (template) are available
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

    try {
      const song = parseSong(content);
      const rendered = this._renderer.render(song);
      this._root.innerHTML = `<pre>${rendered}</pre>`;
    } catch (e: any) {
      this._root.innerHTML = `<div class="error">Parse Error: ${e.message}</div>`;
    }
  }
}
