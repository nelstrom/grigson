export function getGrilleStyles(typeface: string = 'sans'): string {
  const fontFamily =
    typeface === 'cursive'
      ? '"GrigsonCursive", cursive'
      : typeface === 'sans'
        ? '"GrigsonSans", sans-serif'
        : '"GrigsonSerif", serif';
  const simileFamily =
    typeface === 'cursive'
      ? '"GrigsonCursive", cursive'
      : typeface === 'sans'
        ? '"GrigsonSans", "GrigsonTimeSig", sans-serif'
        : '"GrigsonSerif", "GrigsonTimeSig", serif';
  return `
/* ── Variables ── */
[part~="chart"] {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  --cg-grid-width: 2px;
  --cg-diag-width: 0.5px;
  --cg-diag-style: solid;
  --cg-chart-width: 100%;
  --cg-aspect-ratio: 1;
  --cg-font-size: 1rem;
  /* Negative angle → "/" direction (bottom-left to top-right) */
  --cg-diag-angle: calc(-1 * atan2(var(--cg-aspect-ratio, 1), 1));
  /* 100% resolves to bar pixel width on position:absolute children */
  --cg-diag-len: calc(100% * hypot(1, var(--cg-aspect-ratio, 1)));
  --cg-slash-angle: 45deg;
  --cg-slash-chord-offset: -0.35em;
  --cg-slash-bass-offset: 0.35em;
  font-family: ${fontFamily};
  font-size: var(--cg-font-size, 1rem);
  display: block;
}

/* ── Section rows ── */
/* No background here — the row carries its own background so incomplete
   rows don't extend the coloured area into the empty trailing space. */
[part~="section-rows"] {
  display: flex;
  flex-direction: column;
  container-type: inline-size;
  flex: 1;
}

/* ── Row ── */
/* Each row owns its grid background and shrinks to fit its actual bars,
   so the page background shows through where bars are absent. Every row
   carries its own bottom border (padding-bottom); adjacent rows collapse
   the shared border via a negative margin so it stays single-width. */
[part~="row"] {
  display: flex;
  gap: var(--cg-grid-width);
  background: currentColor;
  padding: var(--cg-grid-width);
  width: fit-content;
  margin-bottom: calc(-1 * var(--cg-grid-width));
}

[part~="section-rows"] [part~="row"]:last-child {
  margin-bottom: 0;
}

/* ── Bar ── */
/* Fixed width based on --cg-bars-per-line so all bars are the same size
   regardless of how many are in the row. 100cqi = section-rows width. */
[part~="bar"] {
  background: Canvas;
  color: CanvasText;
  flex: 0 0 calc((100cqi - (var(--cg-bars-per-line, 4) + 1) * var(--cg-grid-width)) / var(--cg-bars-per-line, 4));
  min-width: 0;
  aspect-ratio: var(--cg-aspect-ratio, 1);
  position: relative;
  overflow: hidden;
}

/* ── Lines ── */
[part~="line"] {
  position: absolute;
  top: 50%;
  left: 50%;
  height: 0;
  border-top: var(--cg-diag-width) var(--cg-diag-style) currentColor;
  transform-origin: center;
}

/* Full "/" diagonal: bottom-left to top-right */
[part~="line-diag"] {
  width: var(--cg-diag-len);
  transform: translate(-50%, -50%) rotate(var(--cg-diag-angle));
}

/* Full "\" anti-diagonal: top-left to bottom-right */
[part~="line-anti"] {
  width: var(--cg-diag-len);
  transform: translate(-50%, -50%) rotate(calc(-1 * var(--cg-diag-angle)));
}

/* Half-length "/" lines — centered in their quadrant */
[part~="line-diag-tl"] {
  width: calc(var(--cg-diag-len) / 2);
  top: 25%;
  left: 25%;
  transform: translate(-50%, -50%) rotate(var(--cg-diag-angle));
}

[part~="line-diag-tr"] {
  width: calc(var(--cg-diag-len) / 2);
  top: 25%;
  left: 75%;
  transform: translate(-50%, -50%) rotate(var(--cg-diag-angle));
}

[part~="line-diag-bl"] {
  width: calc(var(--cg-diag-len) / 2);
  top: 75%;
  left: 25%;
  transform: translate(-50%, -50%) rotate(var(--cg-diag-angle));
}

[part~="line-diag-br"] {
  width: calc(var(--cg-diag-len) / 2);
  top: 75%;
  left: 75%;
  transform: translate(-50%, -50%) rotate(var(--cg-diag-angle));
}

/* Half-length "\" lines — centered in their quadrant */
[part~="line-anti-tl"] {
  width: calc(var(--cg-diag-len) / 2);
  top: 25%;
  left: 25%;
  transform: translate(-50%, -50%) rotate(calc(-1 * var(--cg-diag-angle)));
}

[part~="line-anti-tr"] {
  width: calc(var(--cg-diag-len) / 2);
  top: 25%;
  left: 75%;
  transform: translate(-50%, -50%) rotate(calc(-1 * var(--cg-diag-angle)));
}

[part~="line-anti-bl"] {
  width: calc(var(--cg-diag-len) / 2);
  top: 75%;
  left: 25%;
  transform: translate(-50%, -50%) rotate(calc(-1 * var(--cg-diag-angle)));
}

[part~="line-anti-br"] {
  width: calc(var(--cg-diag-len) / 2);
  top: 75%;
  left: 75%;
  transform: translate(-50%, -50%) rotate(calc(-1 * var(--cg-diag-angle)));
}

/* Vertical internal divider */
[part~="line-vert"] {
  width: var(--cg-grid-width);
  height: 100%;
  border-top: none;
  background: currentColor;
  top: 0;
  transform: translateX(-50%);
}

/* ── Chord labels ── */
[part~="chord"] {
  position: absolute;
  line-height: 1;
  white-space: nowrap;
  color: CanvasText;
}

[part~="bar-1"] [part~="chord"] {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

[part~="bar-1"] [part~="chord-slash"] {
  display: inline-flex;
}

[part~="bar-simile"] [part~="chord"] {
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${simileFamily};
  font-size: 1.4em;
  transform: translateY(-0.3em);
}

/* Global chord label positions (W/N/S/E zones and span zones) */
[part~="chord-left"]   { top: 50%;    left: 18%;  transform: translate(-50%, -50%); }
[part~="chord-top"]    { top: 20%;    left: 50%;  transform: translate(-50%, -50%); }
[part~="chord-bottom"] { bottom: 20%; left: 50%;  transform: translate(-50%, 50%); }
[part~="chord-right"]  { top: 50%;    right: 18%; transform: translate(50%, -50%); }
[part~="chord-tl"]     { top: 33%;    left: 33%;  transform: translate(-50%, -50%); }
[part~="chord-br"]     { bottom: 33%; right: 33%; transform: translate(50%, 50%); }
[part~="chord-mid"]    { top: 50%;    left: 50%;  transform: translate(-50%, -50%); }

/* 3+1: main = W+N+S area; corner = E (right-center) */
[part~="bar-3-1"] [part~="chord-main"]   { top: 40%; left: 35%; transform: translate(-50%, -50%); }
[part~="bar-3-1"] [part~="chord-corner"] { top: 50%; right: 20%; transform: translate(50%, -50%); }

/* 1+3: corner = W (left-center); main = N+S+E area */
[part~="bar-1-3"] [part~="chord-corner"] { top: 50%; left: 15%; transform: translate(-50%, -50%); }
[part~="bar-1-3"] [part~="chord-main"]   { bottom: 40%; right: 35%; transform: translate(50%, 50%); }

/* ── Section ── */
[part~="section"] {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  break-inside: avoid;
  width: var(--cg-chart-width);
}
[part~="section"] + [part~="section"] {
  margin-top: calc(-1 * var(--cg-grid-width));
}
[part~="section-label"] {
  font-family: system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.6;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
}

/* ── Header ── */
[part~="song-header"] {
  font-family: system-ui, sans-serif;
  margin-bottom: 0.75rem;
}
[part~="song-title"] {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}
[part~="song-key"] {
  font-size: 0.8rem;
  opacity: 0.6;
  margin: 0;
}

/* ── Glyph spacing ── */
[part="chord-accidental"][data-glyph="unicode"] {
  vertical-align: super;
  line-height: 0;
  margin-left: 0.05em;
  margin-right: 0.05em;
}

[part="quality-accidental"][data-glyph="unicode"] {
  font-size: 1em;
  vertical-align: 0.15em;
  line-height: 0;
  margin-left: 0.05em;
  margin-right: 0.05em;
}

/* ── Diagonal slash chord ── */
[part~="chord-slash"] {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 0;
}

[part~="chord-slash"] [part="chord-top"] {
  align-self: flex-start;
  transform: translateY(var(--cg-slash-chord-offset));
}

[part~="chord-slash"] [part="chord-fraction-line"] {
  position: relative;
  display: inline-block;
  width: 0.5em;
  height: 1.2em;
  background: none;
  overflow: visible;
}

[part~="chord-slash"] [part="chord-fraction-line"]::before {
  content: "";
  position: absolute;
  top: 0; bottom: 0; left: 50%;
  width: 1px;
  background: currentColor;
  transform: rotate(var(--cg-slash-angle));
  transform-origin: center;
}

[part~="chord-slash"] [part="chord-bass"] {
  align-self: flex-end;
  transform: translateY(var(--cg-slash-bass-offset));
}

`;
}
