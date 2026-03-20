/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach } from 'vitest';
import './register.js';
import { GrigsonChart } from './element.js';

describe('GrigsonChart', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const wait = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('renders a chart from a child template', async () => {
    document.body.innerHTML = `
      <grigson-chart>
        <template>
          | C |
        </template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    const song = shadowRoot.querySelector('[part="song"]');
    expect(song).not.toBeNull();
    expect(song!.textContent!.trim()).toBe('| C |');
  });

  it('handles empty templates gracefully', async () => {
    document.body.innerHTML = `
      <grigson-chart>
        <template></template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    // Only the style element should remain
    expect(shadowRoot.querySelector('[part="song"]')).toBeNull();
  });

  it('renders nothing if no template is found', async () => {
    document.body.innerHTML = `
      <grigson-chart></grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    expect(shadowRoot.querySelector('[part="song"]')).toBeNull();
  });

  it('shows an error if parsing fails', async () => {
    document.body.innerHTML = `
      <grigson-chart>
        <template>
          | invalid |
        </template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    const errorDiv = shadowRoot.querySelector('div');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv!.textContent).toBeTruthy();
  });

  it('updates when update() is called manually', async () => {
    document.body.innerHTML = `
      <grigson-chart>
        <template>
          | C |
        </template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart') as GrigsonChart;
    const shadowRoot = element.shadowRoot!;
    const template = element.querySelector('template')!;

    expect(shadowRoot.querySelector('[part="song"]')!.textContent!.trim()).toBe('| C |');

    template.innerHTML = '| G |';
    element.update();

    expect(shadowRoot.querySelector('[part="song"]')!.textContent!.trim()).toBe('| G |');
  });

  it('normalises chords when the normalise attribute is present', async () => {
    document.body.innerHTML = `
      <grigson-chart normalise>
        <template>
          | F | A# |
        </template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;

    // A# in F major (or Bb major) should be normalised to Bb
    const row = shadowRoot.querySelector('[part="row"]')!;
    expect(row.textContent!.trim()).toBe('| F | Bb |');
  });

  it('renders with part attributes for styling', async () => {
    document.body.innerHTML = `
      <grigson-chart>
        <template>| C |</template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;

    expect(shadowRoot.querySelector('[part="row"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[part="barline"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[part="chord"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[part="chord-root"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[part="chord-suffix"]')).not.toBeNull();
  });

  it('renders front matter with part attributes', async () => {
    document.body.innerHTML = `
      <grigson-chart>
        <template>---
title: "Test Song"
key: C
---
| C |</template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;

    expect(shadowRoot.querySelector('[part="frontmatter"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[part="frontmatter-value"]')).not.toBeNull();
  });

  it('allows styling via CSS Custom Properties', async () => {
    document.body.innerHTML = `
      <style>
        grigson-chart {
          --grigson-color: red;
        }
      </style>
      <grigson-chart>
        <template>| C |</template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;

    // Note: getComputedStyle might not work perfectly with happy-dom but we can check if it's applied to the element.
    const style = window.getComputedStyle(element);
    expect(style.getPropertyValue('--grigson-color').trim()).toBe('red');
  });

  it('uses a child renderer element that implements renderChart', async () => {
    // Register a mock renderer
    class MockRenderer extends HTMLElement {
      renderChart() {
        const div = document.createElement('div');
        div.setAttribute('data-mock', 'true');
        div.textContent = 'mock-output';
        return div;
      }
    }
    if (!customElements.get('mock-renderer')) {
      customElements.define('mock-renderer', MockRenderer);
    }

    document.body.innerHTML = `
      <grigson-chart>
        <mock-renderer></mock-renderer>
        <template>| C |</template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    expect(shadowRoot.querySelector('[data-mock="true"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[data-mock="true"]')!.textContent).toBe('mock-output');
  });

  it('renders a chart from an external template referenced by ID', async () => {
    document.body.innerHTML = `
      <template id="ext-tmpl">| Am |</template>
      <grigson-chart template="ext-tmpl"></grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    const song = shadowRoot.querySelector('[part="song"]');
    expect(song).not.toBeNull();
    expect(song!.textContent!.trim()).toBe('| Am |');
  });

  it('prefers inline template over external template', async () => {
    document.body.innerHTML = `
      <template id="ext-tmpl">| G |</template>
      <grigson-chart template="ext-tmpl">
        <template>| C |</template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    const song = shadowRoot.querySelector('[part="song"]');
    expect(song!.textContent!.trim()).toBe('| C |');
  });

  it('renders nothing when external template ID does not exist', async () => {
    document.body.innerHTML = `
      <grigson-chart template="nonexistent-id"></grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    expect(shadowRoot.querySelector('[part="song"]')).toBeNull();
  });

  it('re-renders when the template attribute changes to a different ID', async () => {
    document.body.innerHTML = `
      <template id="tmpl-c">| C |</template>
      <template id="tmpl-g">| G |</template>
      <grigson-chart template="tmpl-c"></grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart') as GrigsonChart;
    const shadowRoot = element.shadowRoot!;

    expect(shadowRoot.querySelector('[part="song"]')!.textContent!.trim()).toBe('| C |');

    element.setAttribute('template', 'tmpl-g');
    await wait();

    expect(shadowRoot.querySelector('[part="song"]')!.textContent!.trim()).toBe('| G |');
  });

  it('uses the first child renderer when multiple implement renderChart', async () => {
    class RendererA extends HTMLElement {
      renderChart() {
        const div = document.createElement('div');
        div.setAttribute('data-renderer', 'a');
        return div;
      }
    }
    class RendererB extends HTMLElement {
      renderChart() {
        const div = document.createElement('div');
        div.setAttribute('data-renderer', 'b');
        return div;
      }
    }
    if (!customElements.get('renderer-a')) customElements.define('renderer-a', RendererA);
    if (!customElements.get('renderer-b')) customElements.define('renderer-b', RendererB);

    document.body.innerHTML = `
      <grigson-chart>
        <renderer-a></renderer-a>
        <renderer-b></renderer-b>
        <template>| C |</template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    expect(shadowRoot.querySelector('[data-renderer="a"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[data-renderer="b"]')).toBeNull();
  });
});
