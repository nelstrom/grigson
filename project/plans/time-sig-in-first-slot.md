# Plan: Move time-sig into the first beat slot

## Context

The time-sig currently lives inside the barline span (the `auto` gap column). This causes two
problems: (a) a dead-space gap between the time-sig and the first chord when the auto column is
wider than needed (different barline glyph widths across rows); (b) the 2/4 mid-row case where
the time-sig overflows because the auto column was sized by other rows that have no time-sig
there.

This plan moves the time-sig into the first `1fr` slot of the bar, so it is rendered as a flex
sibling of the first chord — eliminating both issues. The goal is to see how it looks; CSS
tuning may be needed after the visual is evaluated.

---

## Changes: `html.ts`

### 1. Remove `showTimeSig` from `renderBarline()`

```typescript
// Before:
function renderBarline(
  barline: Barline,
  col: number,
  position: 'start' | 'mid' | 'end',
  showTimeSig?: TimeSignature,
): string { … }

// After:
function renderBarline(
  barline: Barline,
  col: number,
  position: 'start' | 'mid' | 'end',
): string { … }
```

Remove `timeSigHtml` from the returned string.

### 2. Stop passing `showTimeSig` to `renderBarline()` in `renderRow()`

```typescript
// Open barline — no longer carries the time sig
html += renderBarline(row.openBarline, rowLayout.openBarlineCol, 'start');

// Close barlines — no longer carry the time sig of the next bar
html += renderBarline(bar.closeBarline, barLayout.closeBarlineCol, isLastBar ? 'end' : 'mid');
```

### 3. Inject the time-sig into the first slot

The first slot of every bar is rendered inside the slot loop. For bars with `showTimeSig`, prepend
the time-sig HTML before the chord content in the first slot (slotIdx === 0):

```typescript
for (let slotIdx = 0; slotIdx < barLayout.slots.length; slotIdx++) {
  const slotLayout = barLayout.slots[slotIdx];
  const { col, span } = slotLayout;
  const srcIdx = slotLayout.sourceSlotIdx ?? slotIdx;
  const slot: BeatSlot | undefined = bar.slots[srcIdx];
  const timeSigPrefix = slotIdx === 0 && barLayout.showTimeSig
    ? renderTimeSig(barLayout.showTimeSig)
    : '';

  if (slotLayout.implicit || slot?.type === 'dot') {
    html += `<span part="dot" style="grid-column: ${col} / span 1">${timeSigPrefix}/</span>`;
  } else if (slot) {
    const slotContent = renderChord(slot.chord, preset, flatChar, sharpChar, mode);
    html += `<span part="slot" style="grid-column: ${col} / span ${span}">${timeSigPrefix}${slotContent}</span>`;
  }
}
```

Note: the dot case (`timeSigPrefix` inside `part="dot"`) is an edge case (a bar starting with a
dot that also changes time signature). It probably never occurs in practice, but handling it
avoids a dropped time-sig silently.

---

## Changes: `html-element.ts`

The `[part="time-sig"]` CSS needs two adjustments for the slot context:

### 1. Replace `padding-left` with `padding-right`

`padding-left: 0.2em` was spacing between the barline glyph and the time-sig. In the slot, the
0.4em barline margin already provides separation. The padding should now go to the right (between
time-sig and chord):

```css
[part="time-sig"] {
  …
  padding-left: 0;        /* was 0.2em — now handled by barline margin-right */
  padding-right: 0.2em;   /* new: gap between time-sig and chord */
}
```

### 2. Vertical alignment may need tuning

The `top: calc(var(--grigson-time-sig-top) - 50%)` offset was tuned when the time-sig was a
flex child of a `align-items: center` barline. In the slot (`align-items: baseline`), the
time-sig's baseline aligns with the chord text before the `top` offset is applied. The visual
result may need `--grigson-time-sig-top` to be adjusted per typeface, or the time-sig may need
`align-self: center` to restore the old behaviour. Evaluate visually first before changing.

---

## Tests: `html.test.ts`

Existing tests that assert `part="time-sig"` appears inside a `part="barline"` element will
fail. Update them to assert the time-sig appears inside `part="slot"` instead.

Find the relevant tests with:

```
grep -n "time-sig" packages/grigson/src/renderers/html.test.ts
```

---

## Files to modify

| File                                             | Change                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| `packages/grigson/src/renderers/html.ts`         | Remove `showTimeSig` from `renderBarline()`; inject time-sig into first slot |
| `packages/grigson/src/renderers/html-element.ts` | Swap `padding-left` → `padding-right`; evaluate `top` offset                 |
| `packages/grigson/src/renderers/html.test.ts`    | Update time-sig location assertions                                          |

---

## Verification

1. `pnpm build` and `pnpm test` pass
2. Open a song with:
   - An opening bar with a repeat sign + time-sig (e.g. INTRO `||: 4/4`) — time-sig should appear immediately before the first chord
   - Multiple sections each showing a time-sig on their first bar — verify no dead space before the first chord
   - A mid-song meter change (e.g. to 2/4) — verify time-sig does not overflow its bar
3. Check all three typefaces (sans, serif, cursive) — vertical alignment of time-sig may differ and need per-typeface tuning via `--grigson-time-sig-top`
