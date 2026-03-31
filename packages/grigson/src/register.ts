import { GrigsonChart } from './element.js';
import { GrigsonHtmlRenderer } from './renderers/html-element.js';

export { registerPreset } from './notation/registry.js';

if (typeof customElements !== 'undefined') {
  customElements.define('grigson-html-renderer', GrigsonHtmlRenderer);
  customElements.define('grigson-chart', GrigsonChart);
}
