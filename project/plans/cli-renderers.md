# Architecture: CLI Renderer Extensibility

## Context

The grigson package defines a parser and two renderers (text, HTML). It is designed to be extensible: third parties can author renderers published as custom elements that slot into `<grigson-chart>` as children. The question is how these same third-party renderers compose with the CLI.

An earlier sketch proposed `grigson render --format=text,html,svg`, but this approach doesn't accommodate third-party renderers cleanly — there is no obvious way to pass renderer-specific configuration through a generic `--format` flag.

---

## Decision: drop `grigson render`, adopt the binary renderer pattern

### Why `grigson render` is redundant

- `grigson normalise` and `grigson transpose` already emit `.chart` text to stdout — that *is* the text representation of a chart
- Rendering to HTML or SVG requires renderer-specific options (page size, notation preset, colour scheme, etc.) that vary per renderer and cannot be expressed via a generic grigson flag
- The `--format` flag cannot accommodate third-party renderers without either (a) constraining how they are configured or (b) adding awkward pass-through flags

`grigson render` should be removed from the CLI entirely.

### The binary renderer pattern

Each renderer package ships its own CLI binary. The binary follows a simple interface (see spec below) and handles its own flags. This directly mirrors the browser model — just as each renderer custom element defines its own HTML attributes, each renderer binary defines its own CLI flags.

```sh
# Pipelines using renderer binaries:
cat song.chart | grigson normalise | grigson-html-renderer > out.html
cat song.chart | grigson normalise | grigson transpose --to G | grigson-svg-renderer --page-size A4 > out.svg

# File argument also works:
grigson-html-renderer song.chart > out.html
```

---

## Binary renderer interface spec

A conforming renderer binary must:

1. Accept an optional positional file argument: `renderer-binary [file]`
2. If a file argument is given, read the `.chart` content from that file
3. If no file argument is given, read `.chart` content from stdin
4. Write the rendered output (a string — HTML, SVG, or any format) to stdout
5. On any error (parse failure, render failure), write a message to stderr and exit with code 1
6. On success, exit with code 0

Renderer-specific options (flags) are entirely the renderer binary's own business.

---

## Package dual-export pattern

A renderer package exports two things:

| Entry point | Environment | Export |
|-------------|-------------|--------|
| `.` (default) | Node / CLI | `default export renderChart(song: Song): string` |
| `./element` | Browser | Registers a custom element implementing `GrigsonRendererElement` |

The Node entry has no DOM dependency. It receives a `Song` object and returns a string. This is what the binary calls internally after reading and parsing the input.

```ts
// my-renderer/src/index.ts (Node entry)
import type { Song } from 'grigson';
export default function renderChart(song: Song): string {
  return `<svg>...</svg>`;
}

// my-renderer/src/element.ts (Browser entry)
import { GrigsonRendererElement } from 'grigson';
export class MyRenderer extends HTMLElement implements GrigsonRendererElement {
  renderChart(song: Song): Element { ... }
}
customElements.define('my-renderer', MyRenderer);
```

---

## `runRenderer()` helper

`grigson` core exports a `runRenderer()` function to handle the I/O plumbing that every renderer binary needs identically. Third parties do their own argument parsing and pass in the resolved file path (or `undefined` for stdin).

### API

```ts
type RenderFn = (song: Song) => string;

interface RunRendererOptions {
  /** Path to a .chart file. If omitted, reads from stdin. */
  file?: string;
}

export function runRenderer(render: RenderFn, options?: RunRendererOptions): Promise<void>;
```

### What `runRenderer` handles

- Reads from `options.file` if given, otherwise drains stdin
- Calls `parseSong()` on the input
- Calls `render(song)` and writes the result to stdout
- Writes errors to stderr and calls `process.exit(1)` on any failure

### Example third-party binary

```ts
// my-renderer/bin/cli.ts
import minimist from 'minimist';       // or yargs, commander, process.argv — third party's choice
import { runRenderer } from 'grigson';
import renderChart from '../index.js'; // the Node entry of this package

const args = minimist(process.argv.slice(2));
const pageSize = args['page-size'] ?? 'A4';

await runRenderer(
  (song) => renderChart(song, { pageSize }),
  { file: args._[0] }
);
```

---

## Implications for existing packages

### `grigson` core (`packages/grigson`)

- Remove the `render` subcommand from `cli.ts`
- Add `src/run-renderer.ts` and export `runRenderer()` from `src/index.ts`
- Add `src/html-renderer-cli.ts` — the `grigson-html-renderer` binary, which accepts `--notation-preset` (mirroring the `notation-preset` attribute of `GrigsonHtmlRenderer`)
- Add `grigson-html-renderer` to the `bin` field in `package.json`
- Update CLI docs to remove `render`, add a section on renderer binaries

### `grigson-text-renderer` (`packages/grigson-text-renderer`)

- Add a Node entry (`src/index.ts`) that default-exports `renderChart(song: Song): string` using the existing `TextRenderer`
- Add a binary (`bin/cli.ts`) using `runRenderer()`
- Wire up the `bin` field in `package.json`

### `grigson-svg-renderer` (`packages/grigson-svg-renderer`)

- Add a Node entry (`src/render.ts`) that default-exports `renderChart(song: Song): string`
- The stub implementation returns the same `<svg><text>Under construction</text></svg>` as the custom element — both stay in sync as the renderer is fleshed out
- Add a binary (`src/cli.ts`) using `runRenderer()`
- Wire up the `bin` field in `package.json`
