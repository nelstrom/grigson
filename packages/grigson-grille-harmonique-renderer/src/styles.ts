export function getGrilleStyles(typeface: string = 'sans'): string {
  const fontFamily =
    typeface === 'cursive'
      ? '"GrigsonCursive", cursive'
      : typeface === 'sans'
        ? '"GrigsonSans", sans-serif'
        : '"GrigsonSerif", serif';
  return `
/* ── Variables ── */
[part~="chart"] {
  --cg-grid-width: 2px;
  --cg-diag-width: 0.5px;
  --cg-diag-style: solid;
  --cg-bar-w: 6.5rem;
  --cg-bar-h: 6.5rem;
  /* Negative angle → "/" direction (bottom-left to top-right) */
  --cg-diag-angle: calc(-1 * atan2(var(--cg-bar-h), var(--cg-bar-w)));
  --cg-diag-len:   hypot(var(--cg-bar-w), var(--cg-bar-h));
  --cg-slash-angle: 45deg;
  --cg-slash-chord-offset: -0.35em;
  --cg-slash-bass-offset: 0.35em;
  font-family: ${fontFamily};
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  width: fit-content;
}

/* ── Section rows ── */
[part~="section-rows"] {
  display: flex;
  flex-direction: column;
  background: currentColor;
  padding: var(--cg-grid-width);
  gap: var(--cg-grid-width);
}

/* ── Row ── */
[part~="row"] {
  display: flex;
  gap: var(--cg-grid-width);
}

/* ── Bar ── */
[part~="bar"] {
  background: Canvas;
  color: CanvasText;
  width: var(--cg-bar-w);
  height: var(--cg-bar-h);
  position: relative;
  flex-shrink: 0;
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

[part~="line-diag-br"] {
  width: calc(var(--cg-diag-len) / 2);
  top: 75%;
  left: 75%;
  transform: translate(-50%, -50%) rotate(var(--cg-diag-angle));
}

/* Half-length "\" lines — centered in their quadrant */
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
  font-family: system-ui, sans-serif;
  font-size: 1.4em;
  opacity: 0.4;
}

[part~="bar-2-2"] [part~="chord-tl"] { top: 33%; left: 33%; transform: translate(-50%, -50%); }
[part~="bar-2-2"] [part~="chord-br"] { bottom: 33%; right: 33%; transform: translate(50%, 50%); }

[part~="bar-3-1"] [part~="chord-main"]   { top: 40%; left: 35%; transform: translate(-50%, -50%); }
[part~="bar-3-1"] [part~="chord-corner"] { bottom: 12%; right: 12%; transform: translate(50%, 50%); }

[part~="bar-1-3"] [part~="chord-corner"] { top: 12%; left: 12%; transform: translate(-50%, -50%); }
[part~="bar-1-3"] [part~="chord-main"]   { bottom: 40%; right: 35%; transform: translate(50%, 50%); }

[part~="bar-2-1-1"] [part~="chord-left"] { top: 50%; left: 25%; transform: translate(-50%, -50%); }
[part~="bar-2-1-1"] [part~="chord-tr"]   { top: 22%; right: 20%; transform: translate(50%, -50%); }
[part~="bar-2-1-1"] [part~="chord-br"]   { bottom: 22%; right: 20%; transform: translate(50%, 50%); }

[part~="bar-1-2-1"] [part~="chord-top"]    { top: 18%; left: 18%; transform: translate(-50%, -50%); }
[part~="bar-1-2-1"] [part~="chord-mid"]    { top: 50%; left: 50%; transform: translate(-50%, -50%); }
[part~="bar-1-2-1"] [part~="chord-bottom"] { bottom: 18%; right: 18%; transform: translate(50%, 50%); }

[part~="bar-1-1-2"] [part~="chord-tl"]    { top: 22%; left: 20%; transform: translate(-50%, -50%); }
[part~="bar-1-1-2"] [part~="chord-bl"]    { bottom: 22%; left: 20%; transform: translate(-50%, 50%); }
[part~="bar-1-1-2"] [part~="chord-right"] { top: 50%; right: 25%; transform: translate(50%, -50%); }

[part~="bar-1-1-1-1"] [part~="chord-top"]    { top: 20%;    left: 50%;  transform: translate(-50%, -50%); }
[part~="bar-1-1-1-1"] [part~="chord-right"]  { top: 50%;    right: 18%; transform: translate(50%, -50%); }
[part~="bar-1-1-1-1"] [part~="chord-bottom"] { bottom: 20%; left: 50%;  transform: translate(-50%, 50%); }
[part~="bar-1-1-1-1"] [part~="chord-left"]   { top: 50%;    left: 18%;  transform: translate(-50%, -50%); }

/* ── Section ── */
[part~="section"] {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
