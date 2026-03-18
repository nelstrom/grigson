# Musical Symbols & Time Signatures Plan

This plan implements support for high-quality musical typography using web fonts (SMuFL) and structured HTML for time signatures.

## 0. Meta
*   **Move Plan**: Copy this plan to `project/plans/musical-symbols.md` upon execution start.

## 1. Objective
Enable professional-grade rendering of musical symbols (♯, ♭) and time signatures (stacked numerals) in the HTML output of Grigson charts.

## 2. Proposed Changes

### A. Font Integration (SMuFL)
We will support SMuFL (Standard Music Font Layout) fonts like [Bravura](https://github.com/steinbergmedia/bravura) or [Petaluma](https://github.com/steinbergmedia/petaluma).

1.  **Font Loading**:
    *   Add a mechanism to load a web font (e.g., Google Fonts or a local file).
    *   For the MVP, we will use a CDN link to a SMuFL-compliant font (e.g., Bravura Text) in the default styles or documentation.
    *   Alternatively, we can use a font that supports musical symbols well, or allow the user to provide the font URL.

### B. Configuration Updates (`TextRendererConfig`)
Update `TextRendererConfig` in `packages/grigson/src/renderers/text.ts` to allow defining custom symbols for accidentals.

```typescript
export interface TextRendererConfig {
  notation?: {
    // ... existing ...
    flat?: string;  // e.g., "\uE260" (SMuFL flat)
    sharp?: string; // e.g., "\uE262" (SMuFL sharp)
  };
  // ...
}
```

### C. HTML Renderer Updates (`packages/grigson/src/renderers/html.ts`)

1.  **Time Signatures**:
    *   Update `renderBar` to include time signatures.
    *   Use a structured HTML format:
        ```html
        <span part="time-signature">
          <span part="time-signature-numerator">4</span>
          <span part="time-signature-denominator">4</span>
        </span>
        ```

2.  **Accidentals**:
    *   Update `renderChord` to respect the `flat` and `sharp` configuration.
    *   Ensure these characters are wrapped in a span if necessary for specific font styling, or rely on the global font.
    *   Default behavior: Map `b` -> `♭` and `#` -> `♯` (or SMuFL equivalents if a preset is selected).

### D. CSS Updates (`packages/grigson/src/element.ts`)
Update the default styles in `<grigson-chart>`:

1.  **Font**:
    *   Add a CSS variable `--grigson-font-music` for the musical font.
    *   Load a default font (e.g. `Bravura Text` via `@font-face`) or rely on system fonts if not provided.

2.  **Time Signatures**:
    *   Style `.time-signature` as a flex container (column) or inline-block with tight line-height to stack the numbers.

## 3. Implementation Steps

1.  **Save Plan**: Copy this plan to `project/plans/musical-symbols.md`.
2.  **Update `TextRendererConfig`**: Add `flat` and `sharp` options.
3.  **Update `HtmlRenderer`**:
    *   Implement `renderTimeSignature`.
    *   Integrate `flat`/`sharp` replacement in `renderChord`.
4.  **Update `GrigsonChart` Web Component**:
    *   Add default CSS for time signatures (stacking).
    *   Add support for loading a musical font (optional, or documented).

## 4. Verification

*   Create a test chart with sharps, flats, and time signatures.
*   Verify HTML output contains correct Unicode/SMuFL characters.
*   Verify visual stacking of time signatures in a browser.
