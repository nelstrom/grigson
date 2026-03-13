export class GrigsonChart extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.textContent = 'Grigson Chart Placeholder';
  }
}
