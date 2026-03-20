import type { Song } from 'grigson';
import { TextRenderer, GrigsonRendererUpdateEvent } from 'grigson';
import type { GrigsonRendererElement } from 'grigson';

export class GrigsonTextRenderer extends HTMLElement implements GrigsonRendererElement {
  static get observedAttributes() {
    return [] as string[];
  }

  attributeChangedCallback(_name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    this.dispatchEvent(new GrigsonRendererUpdateEvent());
  }

  renderChart(song: Song): Element {
    const renderer = new TextRenderer();
    const text = renderer.render(song);
    const pre = document.createElement('pre');
    pre.textContent = text;
    return pre;
  }
}
