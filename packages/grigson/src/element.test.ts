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
});
