// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import './register.js';
import { GrigsonChart } from './element.js';
import { GrigsonHtmlRenderer } from './renderers/html-element.js';
import { GrigsonParseErrorEvent, GrigsonRenderErrorEvent, GrigsonRendererUpdateEvent } from './events.js';
import { parseSong } from './parser/parser.js';

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
    expect(song!.querySelector('[part="chord-root"]')!.textContent).toBe('C');
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

    expect(shadowRoot.querySelector('[part="chord-root"]')!.textContent).toBe('C');

    template.innerHTML = '| G |';
    element.update();

    expect(shadowRoot.querySelector('[part="chord-root"]')!.textContent).toBe('G');
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

    // A# in F major (or Bb major) should be normalised to Bb (rendered as B♭)
    const chordRoots = [...shadowRoot.querySelectorAll('[part="chord-root"]')];
    expect(chordRoots).toHaveLength(2);
    expect(chordRoots[0].textContent).toBe('F');
    expect(chordRoots[1].textContent).toBe('B♭');
  });

  it('renders with part attributes for styling', async () => {
    document.body.innerHTML = `
      <grigson-chart>
        <template>| Cm |</template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;

    expect(shadowRoot.querySelector('[part="row"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[part~="barline"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[part="chord"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[part="chord-root"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[part="chord-quality"]')).not.toBeNull();
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

    expect(shadowRoot.querySelector('[part="song-header"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[part="song-title"]')).not.toBeNull();
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
    expect(song!.querySelector('[part="chord-root"]')!.textContent).toBe('A');
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
    expect(song!.querySelector('[part="chord-root"]')!.textContent).toBe('C');
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

    expect(shadowRoot.querySelector('[part="chord-root"]')!.textContent).toBe('C');

    element.setAttribute('template', 'tmpl-g');
    await wait();

    expect(shadowRoot.querySelector('[part="chord-root"]')!.textContent).toBe('G');
  });

  it('calls all child renderers and places both outputs in the shadow root', async () => {
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
    expect(shadowRoot.querySelector('[data-renderer="b"]')).not.toBeNull();
  });

  it('stops rendering and shows error when the second of two renderers throws', async () => {
    class RendererOk extends HTMLElement {
      renderChart() {
        const div = document.createElement('div');
        div.setAttribute('data-renderer', 'ok');
        return div;
      }
    }
    class RendererFail extends HTMLElement {
      renderChart(): Element {
        throw new Error('second renderer failed');
      }
    }
    if (!customElements.get('renderer-ok')) customElements.define('renderer-ok', RendererOk);
    if (!customElements.get('renderer-fail')) customElements.define('renderer-fail', RendererFail);

    const element = document.createElement('grigson-chart') as GrigsonChart;
    const handler = vi.fn();
    element.addEventListener(GrigsonRenderErrorEvent.type, handler);
    element.innerHTML = `
      <renderer-ok></renderer-ok>
      <renderer-fail></renderer-fail>
      <template>| C |</template>
    `;
    document.body.appendChild(element);
    await wait();

    const shadowRoot = element.shadowRoot!;
    expect(shadowRoot.querySelector('[data-renderer="ok"]')).toBeNull();
    const errorDiv = shadowRoot.querySelector('div');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv!.textContent).toBe('second renderer failed');
    expect(handler).toHaveBeenCalledOnce();
  });

  it(':host style contains container-type: inline-size', async () => {
    document.body.innerHTML = `<grigson-chart><template>| C |</template></grigson-chart>`;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const styleEl = element.shadowRoot!.querySelector('style');
    expect(styleEl).not.toBeNull();
    expect(styleEl!.textContent).toContain('container-type: inline-size');
  });

  it('dispatches GrigsonParseErrorEvent and renders fallback div on invalid chart source', async () => {
    const element = document.createElement('grigson-chart') as GrigsonChart;
    const handler = vi.fn();
    element.addEventListener(GrigsonParseErrorEvent.type, handler);
    const template = document.createElement('template');
    template.innerHTML = '| invalid |';
    element.appendChild(template);
    document.body.appendChild(element);

    await wait();

    const shadowRoot = element.shadowRoot!;
    const errorDiv = shadowRoot.querySelector('div');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv!.textContent).toBeTruthy();
    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as GrigsonParseErrorEvent;
    expect(event.error).toBeInstanceOf(Error);
  });

  it('dispatches GrigsonRenderErrorEvent and renders fallback div when renderChart() throws', async () => {
    class ThrowingRenderer extends HTMLElement {
      renderChart(): Element {
        throw new Error('renderer exploded');
      }
    }
    if (!customElements.get('throwing-renderer')) {
      customElements.define('throwing-renderer', ThrowingRenderer);
    }

    const element = document.createElement('grigson-chart') as GrigsonChart;
    const handler = vi.fn();
    element.addEventListener(GrigsonRenderErrorEvent.type, handler);
    const throwingRenderer = document.createElement('throwing-renderer');
    element.appendChild(throwingRenderer);
    const template = document.createElement('template');
    template.innerHTML = '| C |';
    element.appendChild(template);
    document.body.appendChild(element);

    await wait();

    const shadowRoot = element.shadowRoot!;
    const errorDiv = shadowRoot.querySelector('div');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv!.textContent).toBe('renderer exploded');
    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as GrigsonRenderErrorEvent;
    expect(event.error).toBeInstanceOf(Error);
  });

  it('re-renders when template.content is modified', async () => {
    document.body.innerHTML = `
      <grigson-chart>
        <template>| C |</template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    expect(shadowRoot.querySelector('[part="chord-root"]')!.textContent).toBe('C');

    const template = element.querySelector('template')!;
    template.innerHTML = '| Dm |';
    await wait();

    expect(shadowRoot.querySelector('[part="chord-root"]')!.textContent).toBe('D');
  });

  it('re-renders when a grigson:renderer-update event bubbles from a child', async () => {
    class ConfigurableRenderer extends HTMLElement {
      private _label = 'initial';

      setLabel(label: string) {
        this._label = label;
        this.dispatchEvent(new GrigsonRendererUpdateEvent());
      }

      renderChart() {
        const div = document.createElement('div');
        div.setAttribute('data-label', this._label);
        return div;
      }
    }
    if (!customElements.get('configurable-renderer')) {
      customElements.define('configurable-renderer', ConfigurableRenderer);
    }

    document.body.innerHTML = `
      <grigson-chart>
        <configurable-renderer></configurable-renderer>
        <template>| C |</template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    expect(shadowRoot.querySelector('[data-label="initial"]')).not.toBeNull();

    const renderer = element.querySelector('configurable-renderer') as ConfigurableRenderer;
    renderer.setLabel('updated');
    await wait();

    expect(shadowRoot.querySelector('[data-label="updated"]')).not.toBeNull();
    expect(shadowRoot.querySelector('[data-label="initial"]')).toBeNull();
  });
});

describe('GrigsonHtmlRenderer', () => {
  it('renderChart() returns an Element containing expected shadow parts', () => {
    const song = parseSong('| C | G | Am | F |');
    const renderer = new GrigsonHtmlRenderer();
    const result = renderer.renderChart(song);

    expect(result).toBeInstanceOf(Element);
    expect(result.querySelector('[part="song"]')).not.toBeNull();
    expect(result.querySelector('[part="row"]')).not.toBeNull();
    expect(result.querySelector('[part~="barline"]')).not.toBeNull();
    expect(result.querySelector('[part="chord"]')).not.toBeNull();
    expect(result.querySelector('[part="chord-root"]')).not.toBeNull();
    expect(result.querySelector('[part="chord-quality"]')).not.toBeNull();
  });

  it('renderChart() includes frontmatter parts when the song has front matter', () => {
    const song = parseSong('---\ntitle: Test\nkey: C\n---\n| C |');
    const renderer = new GrigsonHtmlRenderer();
    const result = renderer.renderChart(song);

    expect(result.querySelector('[part="song-header"]')).not.toBeNull();
    expect(result.querySelector('[part="song-title"]')).not.toBeNull();
  });
});
