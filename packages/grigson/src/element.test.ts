/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach } from 'vitest';
import './register.js';

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
    const pre = shadowRoot.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre!.textContent!.trim()).toBe('| C |');
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
    expect(shadowRoot.innerHTML).toBe('');
  });

  it('shows an error if no template is found', async () => {
    document.body.innerHTML = `
      <grigson-chart></grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    expect(shadowRoot.innerHTML).toContain('Error: No &lt;template&gt; found');
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
    expect(shadowRoot.innerHTML).toContain('Parse Error:');
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
    const element = document.querySelector('grigson-chart') as any;
    const shadowRoot = element.shadowRoot!;
    const template = element.querySelector('template')!;
    
    expect(shadowRoot.querySelector('pre')!.textContent!.trim()).toBe('| C |');
    
    template.innerHTML = '| G |';
    element.update();
    
    expect(shadowRoot.querySelector('pre')!.textContent!.trim()).toBe('| G |');
  });

  it('updates when notation-preset attribute changes', async () => {
    document.body.innerHTML = `
      <grigson-chart>
        <template>
          | Am | Bm7b5 |
        </template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    
    // Default (jazz)
    expect(shadowRoot.querySelector('pre')!.textContent!.trim()).toBe('| Am | Bm7b5 |');
    
    // Change to symbolic
    element.setAttribute('notation-preset', 'symbolic');
    await wait();
    expect(shadowRoot.querySelector('pre')!.textContent!.trim()).toBe('| A- | Bø |');
    
    // Change back to jazz
    element.setAttribute('notation-preset', 'jazz');
    await wait();
    expect(shadowRoot.querySelector('pre')!.textContent!.trim()).toBe('| Am | Bm7b5 |');
  });

  it('reacts to multiple attribute changes', async () => {
    document.body.innerHTML = `
      <grigson-chart>
        <template>| Am |</template>
      </grigson-chart>
    `;
    await wait();
    const element = document.querySelector('grigson-chart')!;
    const shadowRoot = element.shadowRoot!;
    
    element.setAttribute('notation-preset', 'symbolic');
    element.setAttribute('transpose-semitones', '2'); // Transpose not implemented yet but should trigger update
    await wait();
    
    expect(shadowRoot.querySelector('pre')!.textContent!.trim()).toBe('| A- |');
  });
});
