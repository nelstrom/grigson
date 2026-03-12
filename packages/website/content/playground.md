---
layout: base.njk
title: Playground
permalink: /playground/
---

# Playground

Type or paste a chord chart below. `grigson` will live-normalise it for you.

<style>
  #playground-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: calc(100vh - 300px);
    min-height: 400px;
  }
  #input-textarea {
    flex: 1;
    font-family: monospace;
    padding: 1rem;
    font-size: 1rem;
    border: 1px solid #ccc;
  }
  #output-pre {
    flex: 1;
    background: #f4f4f4;
    padding: 1rem;
    overflow: auto;
    border: 1px solid #ddd;
    margin: 0;
  }
  .error {
    color: #cc0000;
  }
</style>

<div id="playground-container">
  <textarea id="input-textarea" spellcheck="false">
---
title: Playground Example
key: F
---
| F | A# | F | C7 |
|F|Bb|C|F|
</textarea>

  <pre id="output-pre"></pre>
</div>

<script>
  window.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input-textarea');
    const output = document.getElementById('output-pre');
    const renderer = new grigson.TextRenderer();

    function update() {
      try {
        const song = grigson.parseSong(input.value);
        const normalised = grigson.normaliseSong(song);
        output.textContent = renderer.render(normalised);
        output.classList.remove('error');
      } catch (e) {
        output.textContent = 'Error: ' + e.message;
        output.classList.add('error');
      }
    }

    input.addEventListener('input', update);
    update();
  });
</script>
