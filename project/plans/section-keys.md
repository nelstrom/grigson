# Section Key Annotations

## Context

The format documentation specifies that section labels can carry an inline key annotation:
`[Chorus] key: Ab` or `[Bridge] key: F# dorian`. This lets charts with modulating sections
(e.g. verse in E, chorus in A) declare each section's key explicitly rather than relying
entirely on auto-detection. The per-section normalisation infrastructure already exists in
`normaliseSong`; it just never receives a declared key because the Section type has no `key`
field and the grammar discards everything after `]`.

The `kodachrome.chart` example is a good driver: verse chords are clearly in E major, chorus
chords are clearly in A major — adding explicit `key:` annotations proves the end-to-end
feature works and gives the example file more documentation value.

---

## Critical files

| File | Role |
|------|------|
| `packages/grigson/src/parser/grammar.pegjs` | `SectionLabel` and `SongBody` rules |
| `packages/grigson/src/parser/types.ts` | `Section` interface |
| `packages/grigson/src/theory/normalise.ts` | `normaliseSection` and `normaliseSong` |
| `packages/grigson/src/renderers/text.ts` | Section label rendering |
| `packages/grigson/src/renderers/html.ts` | Section label rendering |
| `packages/grigson/src/parser/section.test.ts` | Existing section tests + new ones |
| `packages/grigson/documentation/examples/kodachrome.chart` | Test/example chart |

---

## Key implementation notes

### Key storage format
`section.key` should be stored in **KEYS-table format** — the raw validated value without
applying `normalizeKey`. Examples: `'A'`, `'Am'`, `'F# dorian'`, not `'A major'`/`'A minor'`.
This matters because `detectKey`'s `declaredKey` parameter is checked via
`scores.get(declaredKey)` where `scores` is keyed by `Object.keys(KEYS)` — which uses the
raw format. If we stored `'A major'` (FrontMatter's canonical form), the lookup would always
return `undefined` and the declared key preference would be silently ignored.

### declaredKey threading
`normaliseSection(chords, config)` currently calls `detectKey(chords, null, config)`.
The second argument is `declaredKey`. Change the signature to accept an optional third
parameter and thread it through:

```typescript
export function normaliseSection(
  chords: Chord[],
  config?: DetectKeyConfig,
  declaredKey?: string | null,
): { homeKey: string | null; chords: Chord[] } {
  const detectedKey = config?.forceKey ?? detectKey(chords, declaredKey ?? null, config);
```

In `normaliseSong` at the call site (line 79), pass `sec.key`:
```typescript
const { homeKey, chords: normalisedChords } = normaliseSection(chords, config, sec.key);
```

---

## Step-by-step plan

### 1. `types.ts` — add `key` to Section
```typescript
export interface Section {
  type: 'section';
  label: string | null;
  key: string | null;   // ← new; null when no annotation
  rows: Row[];
}
```

### 2. `grammar.pegjs` — parse optional key annotation in SectionLabel

Update `SectionLabel` to capture an optional ` key: VALUE` suffix using the existing
`FrontMatterValue` rule. Reuse the same `isValidKey` predicate from `FrontMatter` (can
be written inline or extracted as a shared JS function at the top of the grammar).
Store the **raw** value without normalisation.

```peggy
SectionLabel
  = "[" label:$[^\]\r\n]+ "]" _ key:("key" _ ":" _ value:FrontMatterValue { return value; })? _ Newline? {
      if (key !== null) {
        const validNotes = ["C#","Db","D#","Eb","F#","Gb","G#","Ab","A#","Bb","C","D","E","F","G","A","B"];
        const validKeySuffixes = ["m"," dorian"," aeolian"," mixolydian"," major"," minor"," ionian",""];
        const isValidKey = (k) => validNotes.some((n) => validKeySuffixes.some((s) => k === n + s));
        if (!isValidKey(key)) {
          error(`Invalid key: "${key}".`);
        }
      }
      return { type: "sectionLabel", label: label.trim(), key: key ?? null };
    }
```

Update `SongBody` action to track `pendingKey` alongside `pendingLabel`:
```javascript
let pendingLabel = null;
let pendingKey = null;
// ...
if (item.type === "sectionLabel") {
  if (currentRows.length > 0) {
    sections.push({ type: "section", label: pendingLabel, key: pendingKey, rows: currentRows });
    currentRows = [];
  }
  pendingLabel = item.label;
  pendingKey = item.key;
}
// final push:
sections.push({ type: "section", label: pendingLabel, key: pendingKey, rows: currentRows });
```

### 3. `normalise.ts` — thread section.key into detectKey

Update `normaliseSection` signature (add optional `declaredKey` param, pass to detectKey).

Update call site in `normaliseSong` to pass `sec.key`.

### 4. `text.ts` — render key annotation

In `TextRenderer.render()`, change the section label line:
```typescript
// before:
lines.push(`[${section.label}]`);
// after:
const keyPart = section.key !== null ? ` key: ${section.key}` : '';
lines.push(`[${section.label}]${keyPart}`);
```

### 5. `html.ts` — render key annotation in HTML

In the section-label `<div>`, include key annotation when present. Suggested approach:
emit the key as a `<span part="section-key">` inside the section-label div, so CSS can
style it independently.

### 6. `kodachrome.chart` — add annotations

```
[Verse]
...
[Chorus] key: A
...
[Outro] key: A
```
(Chorus and Outro are both centred around A major tonally.)

### 7. Tests in `section.test.ts`

- `[Verse] key: E` → `section.key === 'E'`
- `[Chorus] key: Am` → `section.key === 'Am'`
- `[Bridge] key: F# dorian` → `section.key === 'F# dorian'`
- No annotation → `section.key === null`
- Invalid key `[Section] key: H` → parse error
- Renderer emits `[Chorus] key: Am` when key is present
- Round-trip: parse → render → parse gives equal AST
- Normaliser test: song with `[Chorus] key: Db` where chords contain `C#` → normalised to `Db`

---

## Rebuild and export notes

After grammar changes: `pnpm build:grammar` (or `pnpm build` which includes it).
`Section` is exported from `index.ts` and `index.browser.ts` — no new exports needed
since `key` is just a new field on an existing exported type.

---

## Verification

```bash
pnpm build            # rebuilds grammar + TypeScript
pnpm test             # all existing tests pass + new section key tests
```

Manual smoke test: parse `kodachrome.chart`, confirm `sections[1].key === 'A'` and that
`normaliseSong` returns chords spelled in A major for the chorus (e.g. `C#` stays `C#`
because C# is diatonic to A major, vs E major where it is also diatonic — the real test
is a song where the section key is needed to disambiguate enharmonics).
