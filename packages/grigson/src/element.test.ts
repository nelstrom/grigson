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
    const element = document.querySelector('grigson-chart') as GrigsonChart;
    const shadowRoot = element.shadowRoot!;
    const template = element.querySelector('template')!;
    
    expect(shadowRoot.querySelector('[part="song"]')!.textContent!.trim()).toBe('| C |');
    
    template.innerHTML = '| G |';
    element.update();
    
    expect(shadowRoot.querySelector('[part="song"]')!.textContent!.trim()).toBe('| G |');
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
    expect(shadowRoot.querySelector('[part="song"]')!.textContent!.trim()).toBe('| Am | Bm7b5 |');
    
    // Change to symbolic
    element.setAttribute('notation-preset', 'symbolic');
    await wait();
    expect(shadowRoot.querySelector('[part="song"]')!.textContent!.trim()).toBe('| A- | Bø |');
    
    // Change back to jazz
    element.setAttribute('notation-preset', 'jazz');
    await wait();
    expect(shadowRoot.querySelector('[part="song"]')!.textContent!.trim()).toBe('| Am | Bm7b5 |');
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
    element.setAttribute('transpose-semitones', '2'); // Now implemented!
    await wait();
    
    const text = shadowRoot.querySelector('[part="song"]')!.textContent!.trim();
    expect(text).toContain('| B- |');
    expect(text).toContain('key: Bm');
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
});
