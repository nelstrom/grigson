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
cat file.chart \
  | grigson normalise \
  | grigson transpose --raise 2 \
  | grigson render \
  > output.txt
```

`normalise` and `transpose` are endomorphic — `.chart` in, `.chart` out — so they compose freely in any order. `render` is a terminal step that produces a format (SVG, plain text) that cannot be piped back into another `grigson` command.

## Subcommands

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

| Option         | Description                                              |
| -------------- | -------------------------------------------------------- |
| `--raise <n>`  | Transpose up by `n` semitones (positive integer)         |
| `--lower <n>`  | Transpose down by `n` semitones (positive integer)       |
| `--to <key>`   | Transpose to a target key (e.g. `--to G`, `--to Dm`)    |

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

| Option              | Description                                       |
| ------------------- | ------------------------------------------------- |
| `--format <format>` | Output format: `text` (default) or `json`         |

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

### `grigson render`

Renders a chart to a specified output format.

```
grigson render [options] [file]
```

Reads from `file` if given, otherwise from stdin. Writes to stdout.

**Options**

| Option              | Description                              |
| ------------------- | ---------------------------------------- |
| `--format <format>` | Output format: `text` (default); `svg` is not yet implemented |

**Examples**

```sh
grigson render song.chart                      # plain text output (default)
grigson render song.chart > song.txt           # write to a file
cat song.chart | grigson render                # read from stdin
```
