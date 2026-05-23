When the user asks for a link or URL to any of the Grigson website pages, encode the Grigson source using `./scripts/grigson-url.mjs` and return a clickable Markdown link.

## Pages

| Name         | Path                     |
| ------------ | ------------------------ |
| `sheet`      | `/sheet/`                |
| `playground` | `/tooling/playground/`   |
| `ast`        | `/tooling/ast-explorer/` |

The sheet page is the default when the user doesn't specify.

## Script usage

```
echo "<grigson source>" | ./scripts/grigson-url.mjs [options]
```

Options:

- `--page <sheet|playground|ast>` — which page (omit for just the `#code/` fragment)
- `--renderer <grille-harmonique|html|text>` — which renderer (grille-harmonique is the default for the sheet page)
- `--bars <n>` — bars per line (grille-harmonique only)
- `--host <url>` — base URL (default: `http://localhost:8080`)

## Workflow

1. Identify the Grigson source from the conversation (either from a file or from source the user has written or discussed).
2. Run the script via Bash, piping the source to stdin.
3. Return the result as a clickable Markdown link, e.g. `[Open in sheet](http://localhost:8080/sheet/...)`.

## Example

```bash
printf '---\ntitle: "My Chart"\n---\n\n| Cmaj7 | Dm7 | G7 | Cmaj7 |\n' \
  | ./scripts/grigson-url.mjs --page sheet --renderer grille-harmonique
```
