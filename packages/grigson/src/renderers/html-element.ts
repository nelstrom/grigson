import type { Song } from '../parser/types.js';
import { HtmlRenderer } from './html.js';
import type { TextRendererConfig } from './text.js';
import type { GrigsonRendererElement } from './contract.js';
import { GrigsonRendererUpdateEvent } from '../events.js';
import { getRendererFontFaceCSS, getRendererStyles } from './renderer-css.js';

export { getRendererFontFaceCSS, getRendererStyles };

export class GrigsonHtmlRenderer extends HTMLElement implements GrigsonRendererElement {
  static get observedAttributes() {
    return [
      'notation-preset',
      'simile-output',
      'typeface',
      'accidentals',
      'slash-style',
      'bars-per-line',
      'max-bars-per-line',
      'auto-size',
    ];
  }

  private _lastOutputStyle: HTMLStyleElement | null = null;
  private _printAutoSizeRule = '';

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
    const barsPerLine = parseInt(this.getAttribute('bars-per-line') ?? '', 10);
    if (barsPerLine > 0) {
      config.barsPerLine = barsPerLine;
    }
    const maxBarsPerLine = parseInt(this.getAttribute('max-bars-per-line') ?? '', 10);
    if (maxBarsPerLine > 0) {
      config.maxBarsPerLine = maxBarsPerLine;
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
    this._lastOutputStyle = wrapper.querySelector('style');
    return wrapper;
  }

  runAutoSize(): void {
    const parent = this.parentElement as HTMLElement | null;
    if (!this.hasAttribute('auto-size')) {
      parent?.style.removeProperty('--grigson-font-size');
      if (this._printAutoSizeRule) {
        this._printAutoSizeRule = '';
        this._updateOutputStyle();
      }
      return;
    }
    if (!parent) return;
    const MIN = 0.6,
      MAX = 1.5,
      PRECISION = 0.02;
    parent.style.setProperty('--grigson-font-size', `${MAX}rem`);
    if (!this._hasOverflow(parent)) {
      this._setPrintAutoSize(MAX, parent);
      return;
    }
    let lo = MIN,
      hi = MAX;
    while (hi - lo > PRECISION) {
      const mid = (lo + hi) / 2;
      parent.style.setProperty('--grigson-font-size', `${mid}rem`);
      if (this._hasOverflow(parent)) hi = mid;
      else lo = mid;
    }
    parent.style.setProperty('--grigson-font-size', `${lo}rem`);
    this._setPrintAutoSize(lo, parent);
  }

  private _hasOverflow(parent: HTMLElement): boolean {
    const shadowRoot = parent.shadowRoot;
    if (!shadowRoot) return false;
    for (const cell of shadowRoot.querySelectorAll('[part~="cell"]')) {
      if ((cell as Element).scrollWidth > (cell as Element).clientWidth) return true;
    }
    return false;
  }

  private _setPrintAutoSize(screenSize: number, parent: HTMLElement): void {
    const containerWidth = parent.clientWidth;
    if (containerWidth <= 0) return;
    // A4 minus 3cm margins = ~680 CSS px; ratio scales font proportionally for print columns.
    const PRINT_WIDTH_PX = 680;
    const printSize = Math.max(0.6, screenSize * Math.min(1, PRINT_WIDTH_PX / containerWidth));
    this._printAutoSizeRule = `@media print{:host{--grigson-font-size:${printSize.toFixed(3)}rem!important}}`;
    this._updateOutputStyle();
  }

  private _updateOutputStyle(): void {
    if (this._lastOutputStyle) {
      this._lastOutputStyle.textContent = this._getStyles() + this._printAutoSizeRule;
    }
  }
}
