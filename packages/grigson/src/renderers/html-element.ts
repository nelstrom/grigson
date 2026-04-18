import type { Song } from '../parser/types.js';
import { HtmlRenderer } from './html.js';
import type { TextRendererConfig } from './text.js';
import type { GrigsonRendererElement } from './contract.js';
import { GrigsonRendererUpdateEvent } from '../events.js';
import { getRendererFontFaceCSS, getRendererStyles } from './renderer-css.js';

export { getRendererFontFaceCSS, getRendererStyles };

export class GrigsonHtmlRenderer extends HTMLElement implements GrigsonRendererElement {
  static get observedAttributes() {
    return ['notation-preset', 'simile-output', 'typeface', 'accidentals', 'slash-style'];
  }

  attributeChangedCallback(_name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    this.dispatchEvent(new GrigsonRendererUpdateEvent());
  }

  private _ensureFontFaces(): void {
    const id = 'grigson-font-faces';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = getRendererFontFaceCSS();
      document.head.appendChild(style);
    }
  }

  private _getStyles(): string {
    return getRendererStyles(this.getAttribute('typeface') ?? 'sans');
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
    const slashStyle = this.getAttribute('slash-style');
    if (slashStyle === 'horizontal' || slashStyle === 'diagonal' || slashStyle === 'ascii') {
      config.slashStyle = slashStyle;
    }

    const renderer = new HtmlRenderer(config);
    const html = renderer.render(song);

    const typeface = this.getAttribute('typeface') ?? 'sans';
    const wrapper = document.createElement('div');
    wrapper.dataset.typeface = typeface;
    if (typeof wrapper.setHTMLUnsafe === 'function') {
      wrapper.setHTMLUnsafe(`<style>${this._getStyles()}</style>${html}`);
    } else {
      wrapper.innerHTML = `<style>${this._getStyles()}</style>${html}`;
    }
    return wrapper;
  }
}
