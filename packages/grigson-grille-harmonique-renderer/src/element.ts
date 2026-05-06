import type { Song } from 'grigson';
import { GrigsonRendererUpdateEvent, getRendererFontFaceCSS } from 'grigson';
import type { GrigsonRendererElement } from 'grigson';
import render, { type GrilleConfig } from './render.js';

export class GrigsonGrilleHarmoniqueRenderer extends HTMLElement implements GrigsonRendererElement {
  static get observedAttributes() {
    return ['notation-preset', 'bars-per-line', 'accidentals', 'typeface'];
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

  renderChart(song: Song): Element {
    this._ensureFontFaces();
    const config: GrilleConfig = {};

    const notationPreset = this.getAttribute('notation-preset');
    if (notationPreset) config.notation = { preset: notationPreset };

    const barsPerLine = parseInt(this.getAttribute('bars-per-line') ?? '', 10);
    if (barsPerLine > 0) config.barsPerLine = barsPerLine;

    const accidentals = this.getAttribute('accidentals');
    if (accidentals === 'unicode' || accidentals === 'ascii') config.accidentals = accidentals;

    const typeface = this.getAttribute('typeface');
    if (typeface === 'sans' || typeface === 'serif' || typeface === 'cursive')
      config.typeface = typeface;

    const html = render(song, config);

    const wrapper = document.createElement('div');
    if (typeof wrapper.setHTMLUnsafe === 'function') {
      wrapper.setHTMLUnsafe(html);
    } else {
      wrapper.innerHTML = html;
    }
    return wrapper;
  }
}
