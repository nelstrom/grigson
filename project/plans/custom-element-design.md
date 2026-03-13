# Plan: Grigson Custom Element Design

Design a custom element wrapper for the Grigson parser and renderer, allowing declarative usage in HTML.

## Objective
Enable users to use grigson functionality in a web environment using custom elements.

## Proposed API

### `<grigson-chart>`
The root custom element.

#### Attributes & Properties
- `renderer`: `"svg" | "text"` (default: `"svg"`)
- `transpose-key`: Target key for transposition.
- `transpose-semitones`: Semitones for transposition.
- `notation-preset`: `"jazz" | "pop" | "symbolic"`
- `layout-width`: Width in pixels.
- `...`: (Other config fields mapped to attributes)

#### Child Elements
- `<template>`: Contains the `.chart` source.
- `<grigson-renderer>`: (Optional) Configures the renderer.
    - Attributes: `type` (e.g., `"svg"`, `"text"`)
    - Can contain `<grigson-transpose>`, `<grigson-notation>`, etc., as child elements for modular configuration.

### Example Usage

#### Simple (Attributes)
```html
<grigson-chart transpose-key="A" notation-preset="jazz">
  <template>
    ---
    title: "My Chart"
    key: G
    ---
    | C | G | Am | F |
  </template>
</grigson-chart>
```

#### Complex (Child Elements)
```html
<grigson-chart>
  <grigson-renderer type="svg">
    <grigson-transpose to-key="A" accidentals="flats" />
    <grigson-notation preset="jazz" />
    <grigson-layout width="800" row-height="64" />
  </grigson-renderer>
  <template>
    | C | G | Am | F |
  </template>
</grigson-chart>
```

## Implementation Strategy

### 1. Data Model
- Parse attributes into a `GrigsonConfig` object.
- Observe children to find `<template>` and `<grigson-renderer>`.
- React to changes using `attributeChangedCallback` and a `MutationObserver` on the children.

### 2. Shadow DOM Structure
- A container for the rendered output (SVG or `<pre>` for text).
- Default styles for the renderer output.
- Slots for configuration elements (though they are primarily used as data sources, not for rendering).

### 3. Rendering Pipeline
- In `connectedCallback`:
    1. Parse source from `<template>`.
    2. Collect config from attributes and children.
    3. Choose renderer based on config.
    4. Call `renderer.render(song)`.
    5. Update Shadow DOM content.

## Key Files & Context
- `packages/grigson/src/index.browser.ts`: Entry point for browser-safe exports.
- `packages/grigson/src/renderers/`: Existing renderers (Text) and future ones (SVG).
- `packages/grigson/documentation/renderer.md`: Reference for configuration options.

## Architecture & Packaging

The custom element follows a side-effect-free pattern, separating the class definition from its registration.

### 1. Separation of Concerns
- **`src/element.ts`**: Contains the `GrigsonChart` class. This module is side-effect-free and does not call `customElements.define()`.
- **`src/register.ts`**: A small utility module that imports `GrigsonChart` and calls `customElements.define('grigson-chart', GrigsonChart)`. This is the side-effectful entry point.
- **`src/index.browser.ts`**: Re-exports `GrigsonChart` from `element.ts`, ensuring it is available in the main browser bundles (ESM and IIFE).

### 2. Consumer Choices
- **ESM Users**: Can import the class and register it with their preferred tag name:
  ```javascript
  import { GrigsonChart } from 'grigson';
  customElements.define('my-custom-chart', GrigsonChart);
  ```
- **Convenience Users (Auto-register)**: Can import or load a specific "auto-register" bundle that defines the element immediately as `<grigson-chart>`.
- **IIFE Users**: The global `grigson` object will contain the `GrigsonChart` class, allowing them to register it manually. We may also provide a `grigson.register()` helper.

### 3. Build & Bundling
- The main `grigson.esm.js` and `grigson.iife.js` bundles will include the class but will NOT register it automatically.
- A new, small entry point (`src/register.ts`) can be added to the Vite config to produce a dedicated `grigson-register.iife.js` for those who want a "drop-in" script tag.

## Styling and CSS API

To balance encapsulation with customizability, the element uses Shadow DOM and exposes a CSS API via Custom Properties and Parts.

### 1. CSS Custom Properties (The Stable API)
The element defines a set of variables for common tweaks. These can be set on the `grigson-chart` element itself or any parent.

- `--grigson-chord-color`: Color of chord symbols.
- `--grigson-root-font`: Font family for chord roots.
- `--grigson-suffix-font`: Font family for chord suffixes.
- `--grigson-label-color`: Color of section labels.
- `--grigson-barline-color`: Color of barlines.

### 2. CSS Shadow Parts (`::part`)
For granular control, internal elements are exposed as "parts". This allows users to apply any CSS property to specific components.

| Part Name            | Description                     |
| -------------------- | ------------------------------- |
| `chord-root`         | The root note (e.g., "C")       |
| `chord-suffix`       | The suffix (e.g., "m7")         |
| `section-label`      | Section names (e.g., "Chorus")  |
| `time-signature`     | Time signature marks            |
| `barline`            | The vertical bar separators     |

Example usage:
```css
grigson-chart::part(chord-root) {
  font-weight: bold;
}
```

### 3. Theme Support (Dark/Light Mode)
The default stylesheet provides built-in support for both light and dark modes using the `prefers-color-scheme` media query. 

- **System-Aware Defaults**: The element automatically switches its default colors based on the user's OS settings.
- **Customizable Overrides**: Because the themes are built using the CSS Custom Properties (from Section 1), users can easily override both modes or force a specific theme by setting variables on the element.

```css
/* Example: Forcing a specific dark theme variant */
@media (prefers-color-scheme: dark) {
  grigson-chart {
    --grigson-chord-color: #ffcc00; /* Custom gold chords in dark mode */
  }
}
```

### 4. Packaging Defaults
The element will ship with a "base" stylesheet.
- **Embedded**: The default styles (including dark mode support) are bundled within the custom element's definition and applied to the Shadow Root.
- **External**: An optional `grigson-theme-standard.css` can be provided for users who want a starting point without writing their own CSS.

## Verification & Testing
- Create a test page demonstrating both attribute-based and child-element-based configuration.
- Unit tests for the custom element using a tool like `vitest` with `jsdom` or `happy-dom`.
