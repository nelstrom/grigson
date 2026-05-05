import type { Song } from 'grigson';
import { GrigsonRendererUpdateEvent } from 'grigson';
import type { GrigsonRendererElement } from 'grigson';
import render, { type GrilleConfig } from './render.js';

export class GrigsonGrilleHarmoniqueRenderer extends HTMLElement implements GrigsonRendererElement {
  static get observedAttributes() {
    return ['notation-preset', 'bars-per-line', 'accidentals'];
  }

  attributeChangedCallback(_name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    this.dispatchEvent(new GrigsonRendererUpdateEvent());
  }

  renderChart(song: Song): Element {
    const config: GrilleConfig = {};

    const notationPreset = this.getAttribute('notation-preset');
    if (notationPreset) config.notation = { preset: notationPreset };

    const barsPerLine = parseInt(this.getAttribute('bars-per-line') ?? '', 10);
    if (barsPerLine > 0) config.barsPerLine = barsPerLine;

    const accidentals = this.getAttribute('accidentals');
    if (accidentals === 'unicode' || accidentals === 'ascii') config.accidentals = accidentals;

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
