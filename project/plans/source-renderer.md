# Plan: grigson-source-renderer

## What

A new renderer package — `grigson-source-renderer` — that renders a `.chart` file as
syntax-highlighted source code rather than a visual chart. It produces a `<pre><code>`
block with `<span>` elements carrying semantic CSS classes, styled to look like source
code with token colouring.

---

## Why

The website currently shows `.chart` source with Shiki syntax highlighting, then the
same source rendered as an HTML chart. Shiki is a heavy build-time dependency (bundled
grammars, theme data) that is only used for documentation pages. A dedicated renderer
package would:

- Let any `<grigson-chart>` element display its source in highlighted form by switching
  renderer, without Shiki
- Enable the Eleventy shortcode / DSD progressive-enhancement pattern for source views
  (same as the HTML renderer), so syntax-highlighted source is visible with JS disabled
- Provide a CLI binary (`grigson-source-renderer`) that outputs a standalone HTML page
  from a `.chart` file — no JS required
- Replace or supplement the website's Shiki usage with something from inside the
  grigson ecosystem

---

## Key design decision: AST-walk, not re-tokenisation

A syntax highlighter needs to know what each token _is_. There are three approaches:

| Approach                    | How                                                                           | Problem                                                           |
| --------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Shiki + TextMate grammar    | Run Shiki against TextRenderer output                                         | Heavy dependency; regex matching on reconstructed text is fragile |
| TextRenderer output + regex | Re-tokenise the canonical source string                                       | Fragile; knowledge of token boundaries is already in the AST      |
| AST-walk                    | Walk the `Song` AST, emit annotated spans while reconstructing canonical text | Exact token boundaries, no extra dependencies, self-contained     |

The AST-walk approach is the right one. The `Song` AST carries complete structural
information — chord roots, quality suffixes, barline kinds, section labels, comments,
front matter — so every token can be wrapped in a semantically typed `<span>` without
any re-parsing. The canonical source form is reconstructed during the walk, not
produced separately and then tokenised.

This means the package has **no dependency on Shiki or the TextMate grammar**. It
depends only on `grigson` (for the `Song` type and `runRenderer`).

### Normalisation is acceptable

Because the output is derived from the AST rather than the raw source file, non-canonical
input (e.g. `CM7`, `C-`, `|Am|`) will appear in its canonical form (`Cmaj7`, `Cm7`,
`| Am |`). This is the same behaviour as the TextRenderer and is intentional: the
canonical form is the authoritative representation of the chart.

---

## Token CSS classes

All classes carry the `grigson-` prefix to avoid collisions.

| Class                   | Covers                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| `grigson-delimiter`     | `---` front matter delimiters                                      |
| `grigson-fm-key`        | Front matter keys (`title`, `key`, `meter`)                        |
| `grigson-fm-value`      | Front matter values                                                |
| `grigson-section-label` | Section header text inside `[…]`                                   |
| `grigson-section-key`   | Inline key annotation (`key: Am`) in section headers               |
| `grigson-barline`       | Any barline symbol (`\|`, `\|\|`, `\|\|:`, `:\|\|`, `\|\|.`, etc.) |
| `grigson-repeat-count`  | The `x3` / `x4` suffix on repeat barlines                          |
| `grigson-time-sig`      | Time signature `(4/4)` blocks                                      |
| `grigson-chord-root`    | The root note of a chord (`C`, `F#`, `Bb`)                         |
| `grigson-chord-quality` | The quality suffix (`m`, `7`, `maj7`, `m7b5`, …)                   |
| `grigson-chord-bass`    | The bass note of a slash chord (`/E`) including the slash          |
| `grigson-dot`           | The `.` beat-continuation marker                                   |
| `grigson-comment`       | Entire comment lines (`# …`)                                       |
| `grigson-punctuation`   | Structural characters with no other class (brackets `[`, `]`)      |

The renderer ships a small default stylesheet mapping these classes to colours. Users
can override any class.

---

## Renderer output structure

```html
<pre class="grigson-source">
  <code>
    <span class="grigson-delimiter">---</span>
    <span class="grigson-fm-key">title</span>: <span class="grigson-fm-value">"Autumn Leaves"</span>
    <span class="grigson-fm-key">key</span>: <span class="grigson-fm-value">G</span>
    <span class="grigson-delimiter">---</span>

    <span class="grigson-barline">|</span> <span class="grigson-chord-root">G</span><span class="grigson-chord-quality">7</span> <span class="grigson-barline">|</span> …
  </code>
</pre>
```

Newlines and spacing between tokens are emitted as plain text nodes — they are not
wrapped in spans — so the visual layout is preserved by the `<pre>` element.

---

## Package structure

Mirrors `grigson-text-renderer`:

```
packages/grigson-source-renderer/
  src/
    index.ts          # Node entry: SourceRenderer class, renderChart(song): string
    element.ts        # Browser entry: GrigsonSourceRenderer custom element
    register.ts       # Side-effectful registration (for CDN/IIFE use)
    index.browser.ts  # Browser-only re-export of element + register
  bin/
    cli.ts            # grigson-source-renderer binary
  package.json
  tsconfig.json
  vite.config.ts
```

### Node entry (`src/index.ts`)

Exports a `SourceRenderer` class with a `render(song: Song): string` method (returns
an HTML string) and a `getStyles(): string` method (returns the default CSS). The
binary uses these directly.

### Browser entry (`src/element.ts`)

`GrigsonSourceRenderer` implements `GrigsonRendererElement`:

```ts
renderChart(song: Song): Element {
  const renderer = new SourceRenderer();
  const container = document.createElement('div');
  container.setHTMLUnsafe(renderer.render(song));
  const styleEl = document.createElement('style');
  styleEl.textContent = renderer.getStyles();
  container.prepend(styleEl);
  return container;
}
```

### CLI (`bin/cli.ts`)

Follows the binary renderer interface spec from `cli-renderers.md`:

```sh
grigson-source-renderer [options] [file]

Options:
  --format <format>   "html" (default) or "standalone"
  --theme <theme>     "light" (default) or "dark"
  --help, -h
```

`--format standalone` wraps the output in a full `<!DOCTYPE html>` page with the
default stylesheet inlined, so the file is self-contained and requires no JS.

---

## Progressive enhancement / DSD

The same build-time shortcode pattern used for the HTML renderer applies here.
An Eleventy shortcode `grigsonSourceDSD` would:

1. Parse the source with `parseSong()`
2. Call `SourceRenderer.render()` to get the highlighted HTML string
3. Emit it inside a `<div class="grigson-source-ssr"><template shadowrootmode="open">…</template></div>` sibling
4. Emit a `<grigson-chart renderer="grigson-source-renderer">` element with the raw
   source in a `<template>` child

The same CSS swap (`:not(:defined)` / `:has(+ :defined)`) hides/shows the appropriate
version depending on whether JS has run.

---

## Website impact

Once this package exists, the website's Shiki-based `highlightChart` filter could be
replaced (or made optional) for pages that just need to show `.chart` source inline.
Shiki would remain useful only for mixed-language code blocks (HTML, CSS, JS).

The build-time DSD shortcode also means source-highlighted charts on documentation
pages are visible immediately on page load, before any JS runs — matching the
progressive-enhancement story for visual charts.

---

## Open questions

- **Theme format**: a simple two-theme (light/dark) CSS custom-property scheme is
  probably sufficient. Worth checking whether the token class names should align with
  any existing convention (e.g. VS Code semantic token names) to make it easier for
  users to apply themes they already have.

- **Simile rendering**: should `%` (shorthand simile) be a distinct token class, or
  grouped with `grigson-dot`? Probably its own class (`grigson-simile`) since it has
  distinct meaning.

- **`barsPerLine` / `maxBarsPerLine`**: source renderer should not reflow — row breaks
  in the source are structural information worth preserving in a source view.

- **Website migration**: replacing Shiki entirely would remove the `grigson` TextMate
  grammar highlighting from code samples that show _other_ languages alongside `.chart`
  source. Shiki may need to stay for those pages.
