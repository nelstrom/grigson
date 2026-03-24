# grigson website

The Grigson documentation website, built with [Eleventy](https://www.11ty.dev/).

## Pages

| Path           | Content                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| `/`            | Homepage                                                                 |
| `/format/`     | Chart format reference                                                   |
| `/cli/`        | CLI reference                                                            |
| `/renderer/`   | Renderer documentation                                                   |
| `/testing/`    | Testing strategy                                                         |
| `/demo/`       | Before/after normalisation example                                       |
| `/playground/` | Interactive chart editor with live normalisation and syntax highlighting |

## Local development

```sh
cd packages/website
pnpm install
pnpm run serve
# → http://localhost:8080
```

The playground requires the browser bundle. Build it first:

```sh
pnpm --filter grigson run build   # produces packages/grigson/dist/grigson.iife.js
cd packages/website
pnpm run build                     # Eleventy copies it to _site/js/grigson.iife.js
```

## Deploy

The site is deployed to GitHub Pages automatically on push to `main` via `.github/workflows/deploy.yml`.
