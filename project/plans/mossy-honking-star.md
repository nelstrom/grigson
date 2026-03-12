# Plan: GitHub Pages website with Eleventy

## Context

The grigson project has existing documentation in `documentation/` (markdown files covering the chart format, CLI, renderer, and testing strategy). The goal is to publish a documentation website to GitHub Pages when the project is hosted on GitHub, using Eleventy as the static site generator. This plan describes the recommended repository structure and deployment approach — it does not yet implement anything.

---

## Recommended repository structure

```
grigson/
├── src/                        # Library source (unchanged)
├── dist/                       # Library build output (git-ignored)
├── documentation/              # Raw markdown docs (unchanged — source of truth)
├── website/                    # Eleventy project
│   ├── package.json            # Website-specific dependencies (eleventy, themes, plugins)
│   ├── .eleventy.js            # Eleventy config (input dir, output dir, plugins)
│   ├── content/                # Page source (markdown + Nunjucks/Liquid templates)
│   │   ├── index.md            # Homepage
│   │   ├── format.md           # Chart format reference (derived from documentation/README.md)
│   │   ├── cli.md              # CLI reference (derived from documentation/cli.md)
│   │   ├── renderer.md         # Renderer docs (derived from documentation/renderer.md)
│   │   └── testing.md          # Testing guide (derived from documentation/testing.md)
│   ├── _includes/              # Layout templates
│   │   └── base.njk            # Base HTML layout
│   ├── assets/                 # Static assets (CSS, JS, images)
│   └── _site/                  # Build output (git-ignored)
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI: build website + deploy to GitHub Pages
├── .gitignore                  # Add: website/_site/, website/node_modules/
├── package.json                # Root (library only — unchanged)
└── pnpm-lock.yaml
```

### Key structural decisions

**`website/` is a self-contained sub-project** with its own `package.json` and `node_modules`. This keeps Eleventy and its plugins entirely separate from the library's build toolchain. The root `package.json` does not need to know about Eleventy.

**Documentation content moves into `website/content/`** rather than being read directly from `documentation/`. The `documentation/` folder remains as the informal source-of-truth for contributors working in the repo, and the `website/content/` files are kept in sync manually (or via a copy step). This avoids coupling Eleventy's input path to an external directory.

Alternatively, `documentation/` could be removed and its content consolidated into `website/content/` entirely — keeping one source of truth. This is the simpler long-term approach.

**GitHub Actions deploys on push to `main`** using the official `actions/deploy-pages` action, which pushes the built `_site/` output to GitHub Pages without requiring a separate `gh-pages` branch.

---

## GitHub Actions workflow (`.github/workflows/deploy.yml`)

```yaml
name: Deploy website

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
        working-directory: website
      - run: npm run build
        working-directory: website
      - uses: actions/upload-pages-artifact@v3
        with:
          path: website/_site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**GitHub repository settings required:** In the repo → Settings → Pages, set Source to "GitHub Actions".

---

## Eleventy config sketch (`.eleventy.js`)

```js
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('assets');

  return {
    dir: {
      input: 'content',
      includes: '../_includes',
      output: '_site',
    },
  };
}
```

---

## `.gitignore` additions

```
website/_site/
website/node_modules/
```

---

## PRD tasks (in project/prd.json)

Three tasks, each small enough for one ralph iteration:

### `website-scaffold`
Set up `website/` as an Eleventy sub-project: `package.json`, `.eleventy.js`, `_includes/base.njk` layout. Add `website/_site/` and `website/node_modules/` to `.gitignore`. Confirm `npm run build` inside `website/` produces `_site/`.

### `website-content`
Create `website/content/` with an `index.md` homepage. Copy (and add Eleventy front matter to) the four existing `documentation/` markdown files as content pages: `format.md`, `cli.md`, `renderer.md`, `testing.md`. Confirm Eleventy renders all five pages.

### `website-deploy`
Add `.github/workflows/deploy.yml` with build + deploy-pages jobs. Confirm the workflow file is valid YAML. Document the required GitHub repo setting (Settings → Pages → Source: GitHub Actions).

---

## Verification

1. Clone repo, `cd website && npm install && npm run build` — confirm `_site/` is produced
2. Push to `main` on GitHub — confirm Actions workflow runs and Pages URL is live
3. Check that all documentation pages render correctly at the Pages URL
