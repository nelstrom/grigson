# Source Locations

Every AST node produced by the parser carries an optional `loc` property of type `SourceRange`. Locations are 0-based and follow the LSP convention (line 0, character 0 is the first character of the file).

## Interface

```ts
interface SourceRange {
  start: { line: number; character: number };
  end:   { line: number; character: number };
}
```

`SourceRange` is exported from the package root:

```ts
import type { SourceRange } from 'grigson';
```

## Which nodes have `loc`

All node types carry `loc?: SourceRange`:

| Node type     | Interface     |
| ------------- | ------------- |
| `Song`        | `Song`        |
| `Section`     | `Section`     |
| `Row`         | `Row`         |
| `Bar`         | `Bar`         |
| `ChordSlot`   | `ChordSlot`   |
| `DotSlot`     | `DotSlot`     |
| `Chord`       | `Chord`       |
| `FrontMatter` | `FrontMatter` |
| `CommentLine` | `CommentLine` |

The `Barline` and `TimeSignature` types do not carry a location — they are value objects embedded inside `Bar` and `Row`.

## Example

```ts
import { parseSong } from 'grigson';

const song = parseSong('| C | Am | F | G |\n');
const bar = song.sections[0].rows[0].bars[0];

console.log(bar.loc);
// { start: { line: 0, character: 2 }, end: { line: 0, character: 6 } }

console.log(bar.slots[0].loc);
// { start: { line: 0, character: 2 }, end: { line: 0, character: 4 } }
```

## Notes

- `loc` is always present on nodes produced by `parseSong`, `parseRow`, `parseBar`, `parseChord`, and `parseFrontMatter`.
- The `loc` is enumerable and included in `JSON.stringify` output.
- For `Section` nodes, `loc` spans from the first item in the section (the label, a preamble comment, or the first row) to the last item.
