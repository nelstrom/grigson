export function getGrilleStyles(): string {
  return `
/* ── Variables ── */
[part~="chart"] {
  --cg-gap: 3px;
  --cg-gap2: calc(var(--cg-gap) * 2);
  --cg-gd:  calc(var(--cg-gap) * 0.7071);
  --cg-g17: calc(var(--cg-gap) * 1.7071);
  --cg-bar: 5.5rem;
  font-family: serif;
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  width: fit-content;
}

/* ── Row ── */
[part~="row"] {
  display: flex;
  width: fit-content;
  margin-top: calc(-1 * var(--cg-gap));
}
[part~="row"]:first-child {
  margin-top: 0;
}

/* ── Bar ── */
[part~="bar"] {
  width: var(--cg-bar);
  aspect-ratio: 1;
  background: currentColor;
  position: relative;
  flex-shrink: 0;
  margin-left: calc(-1 * var(--cg-gap));
}
[part~="bar"]:first-child {
  margin-left: 0;
}

/* ── Zones ── */
[part~="zone"] {
  position: absolute;
  inset: 0;
  background: Canvas;
  color: CanvasText;
}

/* bar-1: single inset rectangle */
[part~="bar-1"] [part~="zone"] {
  clip-path: inset(var(--cg-gap));
}

/* bar-2: diagonal top-left / bottom-right */
[part~="bar-2"] [part~="zone-tl"] {
  clip-path: polygon(
    var(--cg-gap)  var(--cg-gap),
    calc(100% - var(--cg-gap2)) var(--cg-gap),
    var(--cg-gap)  calc(100% - var(--cg-gap2))
  );
}
[part~="bar-2"] [part~="zone-br"] {
  clip-path: polygon(
    calc(100% - var(--cg-gap)) var(--cg-gap2),
    calc(100% - var(--cg-gap)) calc(100% - var(--cg-gap)),
    var(--cg-gap2) calc(100% - var(--cg-gap))
  );
}

/* bar-3-1: large trapezoid (3 beats) top-left + small triangle (1 beat) bottom-right */
[part~="bar-3-1"] [part~="zone-main"] {
  clip-path: polygon(
    var(--cg-gap)       var(--cg-gap),
    calc(100% - var(--cg-gap)) var(--cg-gap),
    calc(100% - var(--cg-gap)) calc(50% - var(--cg-gap)),
    calc(50% + var(--cg-gap))  calc(100% - var(--cg-gap)),
    var(--cg-gap)       calc(100% - var(--cg-gap))
  );
}
[part~="bar-3-1"] [part~="zone-corner"] {
  clip-path: polygon(
    calc(100% - var(--cg-gap)) calc(50% + var(--cg-gap)),
    calc(100% - var(--cg-gap)) calc(100% - var(--cg-gap)),
    calc(50% + var(--cg-gap2)) calc(100% - var(--cg-gap))
  );
}

/* bar-1-3: mirror of bar-3-1 — small triangle top-left + large trapezoid bottom-right */
[part~="bar-1-3"] [part~="zone-corner"] {
  clip-path: polygon(
    var(--cg-gap)      var(--cg-gap),
    calc(50% - var(--cg-gap2)) var(--cg-gap),
    var(--cg-gap)      calc(50% - var(--cg-gap))
  );
}
[part~="bar-1-3"] [part~="zone-main"] {
  clip-path: polygon(
    calc(50% - var(--cg-gap))  var(--cg-gap),
    calc(100% - var(--cg-gap)) var(--cg-gap),
    calc(100% - var(--cg-gap)) calc(100% - var(--cg-gap)),
    var(--cg-gap)       calc(100% - var(--cg-gap)),
    var(--cg-gap)       calc(50% + var(--cg-gap))
  );
}

/* bar-2-1-1: left trapezoid (2 beats) + top-right triangle + bottom-right triangle */
[part~="bar-2-1-1"] [part~="zone-left"] {
  clip-path: polygon(
    var(--cg-gap)      var(--cg-gap),
    calc(50% - var(--cg-gap))  var(--cg-gap),
    calc(50% - var(--cg-gap))  calc(100% - var(--cg-gap)),
    var(--cg-gap)      calc(100% - var(--cg-gap))
  );
}
[part~="bar-2-1-1"] [part~="zone-tr"] {
  clip-path: polygon(
    calc(50% + var(--cg-gap))  var(--cg-gap),
    calc(100% - var(--cg-gap)) var(--cg-gap),
    calc(100% - var(--cg-gap)) calc(50% - var(--cg-gap))
  );
}
[part~="bar-2-1-1"] [part~="zone-br"] {
  clip-path: polygon(
    calc(50% + var(--cg-gap))  calc(100% - var(--cg-gap)),
    calc(100% - var(--cg-gap)) calc(50% + var(--cg-gap)),
    calc(100% - var(--cg-gap)) calc(100% - var(--cg-gap))
  );
}

/* bar-1-2-1: top-left triangle + center diamond + bottom-right triangle */
[part~="bar-1-2-1"] [part~="zone-top"] {
  clip-path: polygon(
    var(--cg-gap)      var(--cg-gap),
    calc(50% - var(--cg-gap))  var(--cg-gap),
    var(--cg-gap)      calc(50% - var(--cg-gap))
  );
}
[part~="bar-1-2-1"] [part~="zone-mid"] {
  clip-path: polygon(
    calc(50%)           var(--cg-gap2),
    calc(100% - var(--cg-gap2)) 50%,
    50%                calc(100% - var(--cg-gap2)),
    var(--cg-gap2)     50%
  );
}
[part~="bar-1-2-1"] [part~="zone-bottom"] {
  clip-path: polygon(
    calc(50% + var(--cg-gap))  calc(100% - var(--cg-gap)),
    calc(100% - var(--cg-gap)) calc(50% + var(--cg-gap)),
    calc(100% - var(--cg-gap)) calc(100% - var(--cg-gap))
  );
}

/* bar-1-1-2: mirror of bar-2-1-1 — top-left triangle + bottom-left triangle + right trapezoid */
[part~="bar-1-1-2"] [part~="zone-tl"] {
  clip-path: polygon(
    var(--cg-gap)      var(--cg-gap),
    calc(50% - var(--cg-gap))  var(--cg-gap),
    var(--cg-gap)      calc(50% - var(--cg-gap))
  );
}
[part~="bar-1-1-2"] [part~="zone-bl"] {
  clip-path: polygon(
    var(--cg-gap)      calc(50% + var(--cg-gap)),
    calc(50% - var(--cg-gap))  calc(100% - var(--cg-gap)),
    var(--cg-gap)      calc(100% - var(--cg-gap))
  );
}
[part~="bar-1-1-2"] [part~="zone-right"] {
  clip-path: polygon(
    calc(50% + var(--cg-gap))  var(--cg-gap),
    calc(100% - var(--cg-gap)) var(--cg-gap),
    calc(100% - var(--cg-gap)) calc(100% - var(--cg-gap)),
    calc(50% + var(--cg-gap))  calc(100% - var(--cg-gap))
  );
}

/* bar-4: X pattern */
[part~="bar-4"] [part~="zone-top"] {
  clip-path: polygon(
    var(--cg-g17) var(--cg-gap),
    calc(100% - var(--cg-g17)) var(--cg-gap),
    50% calc(50% - var(--cg-gd))
  );
}
[part~="bar-4"] [part~="zone-right"] {
  clip-path: polygon(
    calc(100% - var(--cg-gap)) var(--cg-g17),
    calc(100% - var(--cg-gap)) calc(100% - var(--cg-g17)),
    calc(50% + var(--cg-gd)) 50%
  );
}
[part~="bar-4"] [part~="zone-bottom"] {
  clip-path: polygon(
    calc(100% - var(--cg-g17)) calc(100% - var(--cg-gap)),
    var(--cg-g17) calc(100% - var(--cg-gap)),
    50% calc(50% + var(--cg-gd))
  );
}
[part~="bar-4"] [part~="zone-left"] {
  clip-path: polygon(
    var(--cg-gap) calc(100% - var(--cg-g17)),
    var(--cg-gap) var(--cg-g17),
    calc(50% - var(--cg-gd)) 50%
  );
}

/* ── Chord labels ── */
[part~="chord"] {
  position: absolute;
  line-height: 1;
  white-space: nowrap;
  color: CanvasText;
}

[part~="bar-1"] [part~="chord"] {
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
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

[part~="bar-2"] [part~="chord-tl"] { top: 33%; left: 33%; transform: translate(-50%, -50%); }
[part~="bar-2"] [part~="chord-br"] { bottom: 33%; right: 33%; transform: translate(50%, 50%); }

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

[part~="bar-4"] [part~="chord-top"]    { top: 20%;    left: 50%;  transform: translate(-50%, -50%); }
[part~="bar-4"] [part~="chord-right"]  { top: 50%;    right: 18%; transform: translate(50%, -50%); }
[part~="bar-4"] [part~="chord-bottom"] { bottom: 20%; left: 50%;  transform: translate(-50%, 50%); }
[part~="bar-4"] [part~="chord-left"]   { top: 50%;    left: 18%;  transform: translate(-50%, -50%); }

/* ── Section ── */
[part~="section"] {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
`;
}
