import type { Song } from 'grigson';
import { GrigsonRendererUpdateEvent } from 'grigson';
import type { GrigsonRendererElement } from 'grigson';

export class GrigsonSvgRenderer extends HTMLElement implements GrigsonRendererElement {
  static get observedAttributes() {
    return [] as string[];
  }

  attributeChangedCallback(_name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    this.dispatchEvent(new GrigsonRendererUpdateEvent());
  }

  renderChart(_song: Song): Element {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.textContent = 'Under construction';
    svg.appendChild(text);
    return svg;
  }
}
