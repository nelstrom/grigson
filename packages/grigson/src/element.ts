import { parseSong } from './parser/parser.js';
import { GrigsonHtmlRenderer } from './renderers/html-element.js';
import type { GrigsonRendererElement } from './renderers/contract.js';
import { normaliseSong } from './theory/normalise.js';
import { transposeSong, transposeSongToKey } from './theory/transpose.js';

export class GrigsonChart extends HTMLElement {
  static get observedAttributes() {
    return ['transpose-key', 'transpose-semitones', 'normalise', 'template'];
  }

  private _root: ShadowRoot;
  private _style: HTMLStyleElement;
  private _isInitialized = false;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._style = document.createElement('style');
    this._style.textContent = ':host { display: block }';
    this._root.appendChild(this._style);
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

  private _findRenderer(): GrigsonRendererElement {
    for (const child of this.children) {
      if (typeof (child as unknown as GrigsonRendererElement).renderChart === 'function') {
        return child as unknown as GrigsonRendererElement;
      }
    }
    return new GrigsonHtmlRenderer();
  }

  private _resolveTemplate(): HTMLTemplateElement | null {
    const inline = this.querySelector('template');
    if (inline) return inline as HTMLTemplateElement;

    const refId = this.getAttribute('template');
    if (refId) {
      const external = document.getElementById(refId);
      if (external instanceof HTMLTemplateElement) return external;
    }

    return null;
  }

  update() {
    const template = this._resolveTemplate();
    if (!template) {
      this._root.replaceChildren(this._style);
      return;
    }

    const content = template.innerHTML.trim();
    if (!content) {
      this._root.replaceChildren(this._style);
      return;
    }

    const renderer = this._findRenderer();

    try {
      let song = parseSong(content);
      if (this.hasAttribute('normalise')) {
        song = normaliseSong(song);
      }
      const transposeKey = this.getAttribute('transpose-key');
      const transposeSemitonesAttr = this.getAttribute('transpose-semitones');
      if (transposeKey) {
        song = transposeSongToKey(song, transposeKey);
      } else if (transposeSemitonesAttr !== null) {
        const semitones = parseInt(transposeSemitonesAttr, 10);
        if (!isNaN(semitones)) {
          song = transposeSong(song, semitones);
        }
      }

      let rendered: Element;
      try {
        rendered = renderer.renderChart(song);
      } catch (renderError) {
        const div = document.createElement('div');
        div.textContent = renderError instanceof Error ? renderError.message : String(renderError);
        this._root.replaceChildren(this._style, div);
        return;
      }

      this._root.replaceChildren(this._style, rendered);
    } catch (parseError) {
      const div = document.createElement('div');
      div.textContent = parseError instanceof Error ? parseError.message : String(parseError);
      this._root.replaceChildren(this._style, div);
    }
  }
}
