import type { Song } from 'grigson';
import { GrigsonRendererUpdateEvent, getRendererFontFaceCSS } from 'grigson';
import type { GrigsonRendererElement } from 'grigson';
import render, { type GrilleConfig } from './render.js';

export class GrigsonGrilleHarmoniqueRenderer extends HTMLElement implements GrigsonRendererElement {
  static get observedAttributes() {
    return ['notation-preset', 'bars-per-line', 'accidentals', 'typeface', 'no-auto-size'];
  }

  private _printStyleEl: HTMLStyleElement | null = null;

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

  runAutoSize(): void {
    const parent = this.parentElement as HTMLElement | null;
    const shadowRoot = parent?.shadowRoot ?? null;
    const chartEl = shadowRoot?.querySelector('[part~="chart"]') as HTMLElement | null;
    if (this.hasAttribute('no-auto-size')) {
      chartEl?.style.removeProperty('--cg-font-size');
      if (this._printStyleEl) this._printStyleEl.textContent = '';
      return;
    }
    if (!chartEl || !parent) return;
    const firstBar = shadowRoot!.querySelector('[part~="bar"]') as HTMLElement | null;
    const barPx = firstBar?.getBoundingClientRect().width ?? 0;
    const MIN = 0.6,
      PRECISION = 0.02;
    const MAX = barPx > 0 ? Math.max(1.5, barPx / 40) : 1.5;
    chartEl.style.setProperty('--cg-font-size', `${MAX}rem`);
    if (!this._measureOverflow()) {
      this._setPrintRule(MAX, parent);
      return;
    }
    let lo = MIN,
      hi = MAX;
    while (hi - lo > PRECISION) {
      const mid = (lo + hi) / 2;
      chartEl.style.setProperty('--cg-font-size', `${mid}rem`);
      if (this._measureOverflow()) hi = mid;
      else lo = mid;
    }
    chartEl.style.setProperty('--cg-font-size', `${lo}rem`);
    this._setPrintRule(lo, parent);
  }

  private _setPrintRule(screenSize: number, parent: HTMLElement): void {
    if (!this._printStyleEl) return;
    const containerWidth = parent.clientWidth;
    if (containerWidth <= 0) return;
    // A4 minus 3cm margins ≈ 680 CSS px; scale font proportionally for print columns.
    const PRINT_WIDTH_PX = 680;
    const printSize = Math.max(0.6, screenSize * Math.min(1, PRINT_WIDTH_PX / containerWidth));
    this._printStyleEl.textContent = `@media print{[part~="chart"]{--cg-font-size:${printSize.toFixed(3)}rem!important}}`;
  }

  private _measureOverflow(): boolean {
    const shadowRoot = (this.parentElement as HTMLElement)?.shadowRoot;
    if (!shadowRoot) return false;
    for (const chord of shadowRoot.querySelectorAll('[part~="chord"]')) {
      const chordEl = chord as HTMLElement;
      const barEl = chordEl.closest('[part~="bar"]') as HTMLElement | null;
      if (!barEl) continue;
      const zone = chordEl.dataset.zone ?? 'full';
      const diagonal = chordEl.dataset.diagonal;
      const chordRect = chordEl.getBoundingClientRect();
      const barRect = barEl.getBoundingClientRect();
      if (barRect.width <= 0 || barRect.height <= 0) continue;
      const x1 = chordRect.left - barRect.left;
      const y1 = chordRect.top - barRect.top;
      const x2 = chordRect.right - barRect.left;
      const y2 = chordRect.bottom - barRect.top;
      const W = barRect.width;
      const H = barRect.height;
      if (diagonal === 'anti') {
        // "/" line: H·x + W·y = H·W; top-left zone is where H·x + W·y < H·W
        if (zone === 'top-left' || zone === 'left') {
          if (H * x2 + W * y2 > H * W) return true;
        } else if (zone === 'bottom-right' || zone === 'right') {
          if (H * x1 + W * y1 < H * W) return true;
        }
      } else if (diagonal === 'main') {
        // "\" line: H·x - W·y = 0; top-right zone is where H·x - W·y > 0
        if (zone === 'top-right' || zone === 'top') {
          if (H * x1 - W * y2 < 0) return true;
        } else if (zone === 'bottom-left' || zone === 'bottom') {
          if (H * x2 - W * y1 > 0) return true;
        }
      } else {
        // Full zone: bounding box check with 10% padding
        const PAD = 0.1;
        if (x1 < -W * PAD || y1 < -H * PAD || x2 > W * (1 + PAD) || y2 > H * (1 + PAD)) return true;
      }
    }
    return false;
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
    this._printStyleEl = document.createElement('style');
    wrapper.appendChild(this._printStyleEl);
    return wrapper;
  }
}
