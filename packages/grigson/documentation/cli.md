# grigson CLI

The `grigson` command-line tool processes `.chart` files. It reads from a file argument or stdin, and writes to stdout by default, making it suitable for use in shell pipelines.

## Running the CLI

**Installed from the registry**

```sh
pnpm add --global grigson
grigson normalise song.chart
```

**As a developer (from source)**

Build the project first, then either invoke Node directly or link the package globally:

```sh
pnpm run build

# Run directly via Node
node dist/cli.js normalise song.chart

# Or link globally so the `grigson` command works
pnpm link --global
grigson normalise song.chart
```

## Pipeline examples

```sh
# Normalise, transpose, then render to HTML
cat song.chart | grigson normalise | grigson transpose --to G | grigson-html-renderer > out.html

# Render a single file to SVG
grigson-svg-renderer song.chart > out.svg
```

`normalise` and `transpose` are endomorphic — `.chart` in, `.chart` out — so they compose freely in any order. Renderer binaries (`grigson-html-renderer`, `grigson-svg-renderer`) are terminal steps: they accept `.chart` input and write their output format to stdout.

## Renderer binaries

Rendering is handled by dedicated binaries rather than a subcommand of `grigson`. Each renderer binary follows the same interface: an optional file argument, stdin fallback, and stdout output.

### `grigson-html-renderer`

Renders a chart to HTML (the same output as the `<grigson-html-renderer>` custom element).

```
grigson-html-renderer [options] [file]
```

**Options**

| Option                          | Description                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `--format <format>`             | Output format: `html` (default), `css` (stylesheet only), or `standalone` (full page)  |
| `--typeface <typeface>`         | Embedded typeface for `css`/`standalone` formats: `sans` (default), `serif`, `cursive` |
| `--notation-preset <name>`      | Named notation preset (e.g. `default`, `realbook`, or a custom registered name)        |
| `--notation-preset-file <path>` | Path to a JSON file containing a partial `NotationPreset` object                       |
| `--simile-output <mode>`        | Simile rendering: `shorthand` (use `%` glyph) or `longhand` (default)                  |
| `--accidentals <mode>`          | Accidental symbols: `unicode` (♭♯, default) or `ascii` (b#)                            |
| `--help`, `-h`                  | Show help and exit                                                                     |

**Examples**

```sh
grigson-html-renderer song.chart > out.html
grigson-html-renderer --format standalone song.chart > out.html
cat song.chart | grigson normalise | grigson-html-renderer --notation-preset realbook > out.html
grigson-html-renderer --notation-preset-file ./my-preset.json song.chart > out.html
grigson-html-renderer --simile-output shorthand song.chart > out.html
```

### `grigson-svg-renderer`

Renders a chart to SVG (the same output as the `<grigson-svg-renderer>` custom element).

```
grigson-svg-renderer [file]
```

**Examples**

```sh
grigson-svg-renderer song.chart > out.svg
cat song.chart | grigson normalise | grigson-svg-renderer > out.svg
```

## Subcommands

### `grigson generate-renderer`

Scaffolds a new renderer package (`grigson-<name>-renderer/`) in the current directory. The generated package includes all the boilerplate needed to build a custom element, a browser bundle, and a CLI binary — ready for `pnpm install && pnpm build`.

```
grigson generate-renderer <name> [options]
```

**Arguments**

| Argument | Description                                                                  |
| -------- | ---------------------------------------------------------------------------- |
| `name`   | Renderer name: lowercase letters, digits, and hyphens (e.g. `high-contrast`) |

**Options**

| Option            | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `--output <path>` | Directory in which to create the package (default: current directory) |

**Examples**

```sh
grigson generate-renderer high-contrast           # creates ./grigson-high-contrast-renderer/
grigson generate-renderer my-renderer --output ~/projects
```

---

### `grigson normalise`

Detects the key of a chart and rewrites chord roots to their canonical enharmonic spelling for that key (e.g. `A#` → `Bb` in F major). Updates the `key` field in front matter to match.

```
grigson normalise [options] [file]
```

Reads from `file` if given, otherwise from stdin. Writes to stdout.

**Options**

| Option                           | Description                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `--key <key>`                    | Hint or override the detected key (e.g. `--key F`, `--key Am`)                 |
| `--enharmonic <f-sharp\|g-flat>` | Prefer `F#` or `Gb` when the two are tied (default: `f-sharp`)                 |
| `-i`, `--in-place`               | Edit the file in place instead of writing to stdout (requires a file argument) |

**Examples**

```sh
grigson normalise song.chart               # write to stdout
grigson normalise -i song.chart            # edit in place
grigson normalise -i *.chart               # bulk normalise
grigson normalise --key Am song.chart      # override key detection
cat song.chart | grigson normalise         # read from stdin
```

---

### `grigson transpose`

Transposes every chord in a chart by a given interval and updates the `key` field in front matter accordingly.

```
grigson transpose [options] [file]
```

Reads from `file` if given, otherwise from stdin. Writes to stdout.

**Options**

| Option        | Description                                          |
| ------------- | ---------------------------------------------------- |
| `--raise <n>` | Transpose up by `n` semitones (positive integer)     |
| `--lower <n>` | Transpose down by `n` semitones (positive integer)   |
| `--to <key>`  | Transpose to a target key (e.g. `--to G`, `--to Dm`) |

Exactly one of `--raise`, `--lower`, or `--to` is required.

**Examples**

```sh
grigson transpose --raise 2 song.chart    # up a whole step
grigson transpose --lower 3 song.chart   # down a minor third
grigson transpose --to G song.chart      # to G major
cat song.chart | grigson transpose --to Dm    # from stdin
```

---

### `grigson validate`

Validates one or more `.chart` files and reports parse errors and semantic warnings. Suitable for CI pipelines and pre-commit hooks.

```
grigson validate [options] [file...]
```

Reads from `file` (or multiple files) if given, otherwise from stdin. Writes diagnostics to stdout. Exits with code 0 if no diagnostics are found, code 1 if any are found (errors or warnings).

**Options**

| Option              | Description                               |
| ------------------- | ----------------------------------------- |
| `--format <format>` | Output format: `text` (default) or `json` |

**Text output format** (default)

```
song.chart:3:7: error: Expected "|" or end of input but "sus4" found.
```

Each line follows the standard linter format: `<file>:<line>:<character>: <severity>: <message>` with 1-indexed line and character numbers.

**JSON output format** (`--format json`)

```json
[
  {
    "file": "song.chart",
    "line": 3,
    "character": 7,
    "severity": "error",
    "message": "Expected \"|\""
  }
]
```

**Examples**

```sh
grigson validate song.chart                    # validate a single file
grigson validate *.chart                       # validate multiple files
grigson validate --format json song.chart      # machine-readable output
cat song.chart | grigson validate              # read from stdin
```

---

## Demonstration

Each example below shows the command and its output together so you can see what the tools actually do.

### Normalisation

#### Fixing accidental spelling

The normaliser detects the key and rewrites enharmonic spellings to match. Here `A#` is wrong in F major — it should be `Bb`:

```sh
$ echo '| F | A# | C | F |' | grigson normalise
---
key: F major
meter: 4/4
---

| F | Bb | C | F |
```

The `key` and `meter` fields are added to the front matter when they are not already present.

#### Tidying whitespace

The output format is always regularised, regardless of how compact the input is:

```sh
$ echo '|F|Bb|C|F|' | grigson normalise
---
key: F major
meter: 4/4
---

| F | Bb | C | F |
```

---

### Transposition

All four examples start from the same chart in F# major. The accidental spelling adapts to each target key automatically — sharps in sharp keys, flats in flat keys.

```sh
$ cat song.chart
---
key: F# major
---
| F# | A#m | B | C#7 |
```

**Up to G major** — sharps throughout:

```sh
$ grigson transpose --to G song.chart
---
key: G
---

| G | Bm | C | D7 |
```

**Up to Ab major** — switches to flat spelling:

```sh
$ grigson transpose --to Ab song.chart
---
key: Ab
---

| Ab | Cm | Db | Eb7 |
```

**Up to Bb major** — also flat:

```sh
$ grigson transpose --to Bb song.chart
---
key: Bb
---

| Bb | Dm | Eb | F7 |
```

**Down 3 semitones to Eb major:**

```sh
$ grigson transpose --lower 3 song.chart
---
key: Eb
---

| Eb | Gm | Ab | Bb7 |
```

---

### Validation

#### Valid chart

A valid chart produces no output and exits with code 0:

```sh
$ echo '| C | Am | F | G |' | grigson validate
$ echo $?
0
```

#### Parse error — unrecognised chord symbol

Chord roots must be a note name A–G. Anything else is a parse error:

```sh
$ echo '| C | Pm | F | G |' | grigson validate
<stdin>:1:7: error: Expected "#", "%", "(", ".", ":||", ":||:", "[", "\n", "\r\n", "|", "||", "||:", [ \t], [A-G], or end of input but "P" found.
$ echo $?
1
```

The error points to the exact position in the input (`line:character`).

#### Semantic warning — beat balance

Parse errors catch syntax problems; semantic warnings catch musical logic errors that the parser accepts. A bar with dot slots must have exactly as many slots as the time signature's numerator:

```sh
$ echo '| (4/4) C . . G . |' | grigson validate
<stdin>:1:3: warning: Bar has 5 slots but time signature is 4/4 (expected 4)
$ echo $?
1
```

---

### HTML rendering

`grigson-html-renderer` reads a chart and writes a `<div>` tree to stdout, using `part` attributes for styling:

```sh
$ echo '| C | Am | F | G |' | grigson-html-renderer
<div part="song" style="--beat-cols: 16; --min-beat-width: 1.00em"><div part="song-grid"><section part="section" style="display: contents"><div part="row" style="grid-column: 1 / 34"><span part="barline barline-single barline-position-start" aria-hidden="true" style="grid-column: 1">…</span><span part="slot bar-start" style="grid-column: 2 / span 7"><span part="chord" aria-label="C, whole bar"><span part="chord-root" aria-hidden="true">C</span></span></span>…</div></section></div></div>
```

The output is unstyled markup. It can be piped into a file and served alongside the grigson stylesheet, or it can be passed through a normalise/transpose step first:

```sh
$ cat song.chart | grigson normalise | grigson transpose --to G | grigson-html-renderer > out.html
```
