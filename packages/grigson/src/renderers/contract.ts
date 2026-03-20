import type { Song } from '../parser/types.js';

/**
 * The contract that all Grigson renderer elements must implement.
 * Third-party renderer custom elements should implement this interface.
 */
export interface GrigsonRendererElement extends HTMLElement {
  /**
   * Render the given song and return the resulting DOM element.
   * The returned element will be placed into GrigsonChart's shadow root.
   */
  renderChart(song: Song): Element;
}
