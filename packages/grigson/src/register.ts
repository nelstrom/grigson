import { GrigsonChart } from './element.js';
import { GrigsonHtmlRenderer } from './renderers/html-element.js';

if (typeof customElements !== 'undefined') {
  customElements.define('grigson-html-renderer', GrigsonHtmlRenderer);
  customElements.define('grigson-chart', GrigsonChart);
}
