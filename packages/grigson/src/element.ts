import { parseSong } from './parser/parser.js';
import { GrigsonHtmlRenderer } from './renderers/html-element.js';
import type { GrigsonRendererElement } from './renderers/contract.js';
import { normaliseSong } from './theory/normalise.js';
import { transposeSong, transposeSongToKey } from './theory/transpose.js';
import {
  GrigsonRendererUpdateEvent,
  GrigsonParseErrorEvent,
  GrigsonRenderErrorEvent,
} from './events.js';

export class GrigsonChart extends HTMLElement {
  static get observedAttributes() {
    return ['transpose-key', 'transpose-semitones', 'normalise', 'template'];
  }

  private _root: ShadowRoot;
  private _style: HTMLStyleElement;
  private _hasDSDContent = false;
  private _isInitialized = false;
  private _childObserver: MutationObserver | null = null;
  private _templateObserver: MutationObserver | null = null;
  private _rendererUpdateListener = () => this.update();

  constructor() {
    super();
    // If the HTML parser already created a DSD shadow root, adopt it rather than re-rendering.
    this._hasDSDContent = !!this.shadowRoot;
    this._root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
    this._style = document.createElement('style');
    this._style.textContent = ':host { display: block; container-type: inline-size; }';
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

    // Remove any declarative shadow root template elements left in the light DOM
    // after HTML parsing. The shadow root has already been created from them;
    // leaving them in place causes "A second declarative shadow root cannot be
    // created on a host" errors when the page is live-reloaded or innerHTML is
    // used to update a parent. Must happen before _childObserver is set up so
    // the removal does not trigger a spurious update().
    this.querySelectorAll(':scope > template[shadowrootmode]').forEach((t) => t.remove());

    this._childObserver = new MutationObserver(() => this.update());
    this._childObserver.observe(this, { childList: true });

    this.addEventListener(GrigsonRendererUpdateEvent.type, this._rendererUpdateListener);

    if (this._hasDSDContent) {
      this._adoptDSD();
    } else {
      // Defer update to ensure children (template) are available
      setTimeout(() => this.update(), 0);
    }
  }

  private _adoptDSD() {
    const template = this._resolveTemplate();
    if (!template) return;
    this._templateObserver = new MutationObserver(() => this.update());
    this._templateObserver.observe(template.content, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  disconnectedCallback() {
    this._childObserver?.disconnect();
    this._childObserver = null;

    this._templateObserver?.disconnect();
    this._templateObserver = null;

    this.removeEventListener(GrigsonRendererUpdateEvent.type, this._rendererUpdateListener);
  }

  private _findRenderers(): GrigsonRendererElement[] {
    const renderers: GrigsonRendererElement[] = [];
    for (const child of this.children) {
      if (typeof (child as unknown as GrigsonRendererElement).renderChart === 'function') {
        renderers.push(child as unknown as GrigsonRendererElement);
      }
    }
    return renderers.length > 0 ? renderers : [new GrigsonHtmlRenderer()];
  }

  private _resolveTemplate(): HTMLTemplateElement | null {
    const inline = this.querySelector('template:not([shadowrootmode])');
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

    this._templateObserver?.disconnect();
    this._templateObserver = null;

    if (!template) {
      this._root.replaceChildren(this._style);
      return;
    }

    this._templateObserver = new MutationObserver(() => this.update());
    this._templateObserver.observe(template.content, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const content = template.innerHTML.trim();
    if (!content) {
      this._root.replaceChildren(this._style);
      return;
    }

    const renderers = this._findRenderers();

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

      const userStyles = Array.from(this.children)
        .filter((c): c is HTMLStyleElement => c.tagName === 'STYLE')
        .map((s) => s.cloneNode(true) as HTMLStyleElement);

      const rendered: Element[] = [];
      for (const renderer of renderers) {
        try {
          const output = renderer.renderChart(song);
          const cls = (renderer as unknown as Element).className;
          if (cls) {
            const wrapper = document.createElement('div');
            wrapper.className = cls;
            wrapper.appendChild(output);
            rendered.push(wrapper);
          } else {
            rendered.push(output);
          }
        } catch (renderError) {
          const div = document.createElement('div');
          div.textContent =
            renderError instanceof Error ? renderError.message : String(renderError);
          this._root.replaceChildren(this._style, div);
          this.dispatchEvent(new GrigsonRenderErrorEvent(renderError));
          return;
        }
      }

      this._root.replaceChildren(this._style, ...userStyles, ...rendered);
    } catch (parseError) {
      const div = document.createElement('div');
      div.textContent = parseError instanceof Error ? parseError.message : String(parseError);
      this._root.replaceChildren(this._style, div);
      this.dispatchEvent(new GrigsonParseErrorEvent(parseError));
    }
  }
}
