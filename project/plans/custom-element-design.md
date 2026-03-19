# Plan: Grigson Custom Element Design

Design a custom element wrapper for the Grigson parser and renderer, allowing declarative usage in HTML. The design prioritises extensibility — third parties can publish their own renderer packages that plug into `<grigson-chart>` without modifying the core library.

## Core Principle

`<grigson-chart>` owns **parse and transform** concerns. Renderer elements own **display** concerns. This separation makes the system pluggable: any element that implements the renderer contract can be used as a child of `<grigson-chart>`.

---

## Proposed API

### `<grigson-chart>`

The root custom element. Parses the chart source, applies transformations, and delegates rendering to a child renderer element.

#### Attributes

| Attribute | Type | Description |
| --- | --- | --- |
| `template` | `string` | ID of an external `<template>` element to use as the chart source |
| `transpose-key` | `string` | Target key for transposition (e.g. `"Bb"`) |
| `transpose-semitones` | `number` | Semitones to transpose by |
| `normalise` | boolean (presence) | Normalise the song before rendering |

#### Source resolution

`<grigson-chart>` finds its `.chart` source from one of two places:

1. **Inline** — a `<template>` child element. Takes precedence if both are present.
2. **External** — a `<template>` element elsewhere in the document, referenced by the `template` attribute.

```html
<!-- Inline (simple case) -->
<grigson-chart>
  <template>
    | C | G | Am | F |
  </template>
</grigson-chart>

<!-- External template (reusable source) -->
<template id="autumn-leaves">
  ---
  title: Autumn Leaves
  key: Gm
  ---
  | Am7b5 | D7 | Gm | Gm |
</template>

<!-- Concert pitch -->
<grigson-chart template="autumn-leaves"></grigson-chart>

<!-- Bb instruments (trumpet, clarinet, tenor sax): sound a major 2nd lower than written, so transpose up 2 semitones -->
<grigson-chart template="autumn-leaves" transpose-semitones="2"></grigson-chart>

<!-- Eb instruments (alto sax, baritone sax): sound a major 6th lower than written, so transpose up 9 semitones -->
<grigson-chart template="autumn-leaves" transpose-semitones="9"></grigson-chart>
```

If `template` is set but no element with that ID exists, the element renders nothing. No error is thrown — the referenced element may be added to the DOM later.

`<grigson-chart>` observes changes to the content of any active `<template>` (inline or external), so editing the `.chart` source triggers a re-parse and re-render. External templates are not observed for changes — only the reference (via the `template` attribute) is tracked.

#### Renderer discovery

`<grigson-chart>` scans its light DOM children for the first element that implements the renderer contract (see below). If none is found, it falls back to the built-in `HtmlRenderer` by instantiating `GrigsonHtmlRenderer` directly as a class (not as a registered custom element), making the fallback independent of registration order.

If multiple children implement the renderer contract, the **first one wins**, silently.

#### Re-render triggers

- Any observed attribute changes (`attributeChangedCallback`)
- Light DOM children added or removed (`MutationObserver { childList: true }`)
- Changes to the active `<template>`'s content (`MutationObserver` on `template.content`)
- A `grigson:renderer-update` event bubbling up from a child renderer

#### Error handling

On parse or render failure, `<grigson-chart>`:

1. Renders a minimal fallback `<div>` into the shadow root with the error message set via `textContent` (never `innerHTML`).
2. Dispatches a typed error event (`GrigsonParseErrorEvent` or `GrigsonRenderErrorEvent`).

#### CSS

`<grigson-chart>`'s own stylesheet contains only:

```css
:host {
  display: block;
}
```

All chord, barline, section, and typography styles belong to the renderer element.

---

### `<grigson-html-renderer>`

The built-in renderer, included in the `grigson` package. Renders the `Song` AST to an HTML structure using `part=` attributes for styling.

#### Attributes

To be defined as rendering features are added. Notation presets are not yet exposed as attributes.

#### CSS Custom Properties

| Property | Description |
| --- | --- |
| `--grigson-font-family` | Font family (default: `monospace`) |
| `--grigson-color` | Text colour (default: `inherit`) |
| `--grigson-background` | Background (default: `transparent`) |
| `--grigson-line-height` | Line height (default: `1.5`) |
| `--grigson-barline-color` | Barline colour |
| `--grigson-chord-root-color` | Chord root colour |
| `--grigson-chord-suffix-color` | Chord suffix colour |
| `--grigson-frontmatter-color` | Front matter colour |

#### CSS Shadow Parts

| Part | Description |
| --- | --- |
| `song` | Root wrapper |
| `frontmatter` | Front matter block |
| `frontmatter-value` | Front matter values |
| `section` | Section wrapper |
| `section-label` | Section name |
| `section-key` | Section key |
| `comment` | Comment lines |
| `row` | A row of bars |
| `barline` | Barline separators |
| `chord` | A chord (root + suffix together) |
| `chord-root` | The root note |
| `chord-suffix` | The quality suffix |
| `dot` | Repeat dot |

#### Theme support

The default stylesheet provides light and dark mode support via `prefers-color-scheme`.

#### Dispatching config changes

When its own configuration changes (e.g. an attribute is updated), `<grigson-html-renderer>` dispatches a `GrigsonRendererUpdateEvent`, which bubbles up to `<grigson-chart>` and triggers a re-render.

---

## Extensibility Contract

### `GrigsonRendererElement` interface

Any custom element implementing this interface can be used as a renderer inside `<grigson-chart>`:

```typescript
export interface GrigsonRendererElement extends HTMLElement {
  renderChart(song: Song): Element;
}
```

The `Song` received is the fully processed AST — already transposed and normalised by `<grigson-chart>`. The renderer is purely a display concern.

### `GrigsonRendererUpdateEvent`

Dispatched by a renderer element when its configuration changes, triggering `<grigson-chart>` to re-render.

```typescript
export class GrigsonRendererUpdateEvent extends Event {
  constructor() {
    super('grigson:renderer-update', { bubbles: true, composed: true });
  }
}
```

### `GrigsonParseErrorEvent` / `GrigsonRenderErrorEvent`

Dispatched by `<grigson-chart>` when a parse or render failure occurs.

```typescript
export class GrigsonParseErrorEvent extends Event {
  readonly error: Error;
  constructor(error: Error) {
    super('grigson:parse-error', { bubbles: true });
    this.error = error;
  }
}

export class GrigsonRenderErrorEvent extends Event {
  readonly error: Error;
  constructor(error: Error) {
    super('grigson:render-error', { bubbles: true });
    this.error = error;
  }
}
```

---

## Third-Party Renderer Example

A third-party renderer package only needs to:

1. Import `GrigsonRendererElement`, `GrigsonRendererUpdateEvent`, and `Song` from `grigson`
2. Implement `renderChart(song: Song): Element`
3. Dispatch `GrigsonRendererUpdateEvent` when its config changes

```typescript
import type { GrigsonRendererElement, Song } from 'grigson';
import { GrigsonRendererUpdateEvent } from 'grigson';

export class EasyReadRenderer extends HTMLElement implements GrigsonRendererElement {
  static get observedAttributes() { return ['dyslexic-font']; }

  attributeChangedCallback() {
    this.dispatchEvent(new GrigsonRendererUpdateEvent());
  }

  renderChart(song: Song): Element {
    const pre = document.createElement('pre');
    // ... render song ...
    return pre;
  }
}
```

Usage:

```html
<grigson-chart>
  <easy-read-renderer dyslexic-font="true"></easy-read-renderer>
  <template>| C | G | Am | F |</template>
</grigson-chart>
```

---

## Architecture & Packaging

### Separation of Concerns

- **`src/element.ts`** — `GrigsonChart` class. Side-effect-free, does not call `customElements.define()`.
- **`src/renderers/element.ts`** — `GrigsonHtmlRenderer` class. Side-effect-free.
- **`src/register.ts`** — Registers both `grigson-chart` and `grigson-html-renderer`. This is the only side-effectful entry point in the core package.
- **`src/index.browser.ts`** — Re-exports both classes and all extensibility interfaces/events.

### Consumer Choices

**ESM users** — import and register with any tag name:
```javascript
import { GrigsonChart, GrigsonHtmlRenderer } from 'grigson';
customElements.define('my-chart', GrigsonChart);
customElements.define('my-html-renderer', GrigsonHtmlRenderer);
```

Note: `GrigsonChart` instantiates `GrigsonHtmlRenderer` directly as its fallback renderer — it does not look up a registered tag name. There is no implicit registration dependency between the two classes.

**Auto-register users** — load the register bundle and use the default tag names immediately:
```html
<script src="grigson-register.iife.js"></script>
```

### Separate Renderer Packages

Additional renderer packages within the monorepo demonstrate the extensibility pattern and serve as reference implementations for third parties. Each follows the same structure as the core package:

| Package | Element | Status |
| --- | --- | --- |
| `grigson-text-renderer` | `<grigson-text-renderer>` | In scope |
| `grigson-svg-renderer` | `<grigson-svg-renderer>` | In scope (stub) |

Each ships:
- A side-effect-free class export
- A `register.ts` / `grigson-*-register.iife.js` for auto-registration

#### `grigson-text-renderer`

Renders the song using the existing `TextRenderer` class and returns the output wrapped in a `<pre>` element. The primary purpose of this package is to demonstrate the extensibility pattern — a functional renderer implemented entirely outside the core `grigson` package.

#### `grigson-svg-renderer`

Returns an `<svg>` element containing the text "Under construction". This package establishes the package structure and build pipeline for an SVG renderer, ready to be filled in when the SVG rendering implementation exists.

---

## Implementation Notes

- Use `setHTML()` where available (Sanitizer API), with `setHTMLUnsafe()` as fallback. Never use `innerHTML`.
- Error message fallback elements must use `textContent`, not any HTML-setting API.
- `disconnectedCallback` on `<grigson-chart>` must disconnect all `MutationObserver` instances.
- `<grigson-chart>`'s shadow root has no `<slot>`, so light DOM children (renderer element, `<template>`) are not rendered visually without any additional CSS.

---

## Verification & Testing

- Unit tests for `GrigsonChart` and `GrigsonHtmlRenderer` using `vitest` with `happy-dom`.
- Test the full renderer contract: a minimal third-party renderer class used as a child of `<grigson-chart>`.
- Test error events are dispatched correctly for parse and render failures.
- Test external template reference, template content changes, and renderer config changes all trigger re-renders.
- A test page in the website demonstrating: inline template, external template (multi-key), third-party renderer child.
