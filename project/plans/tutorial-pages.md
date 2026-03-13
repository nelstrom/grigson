# Plan: Tutorial Pages

## Goal

Add a multi-page tutorial to the website. Each tutorial page:

- is a Nunjucks file whose front matter declares `chart-name` (the stem of a `.chart` file)
- contains Markdown-style prose in the page body explaining the example
- renders two things automatically via the layout: the raw chart source with syntax highlighting, and the normalised output via `<grigson-chart normalise>`

---

## New directory structure

```
packages/website/
  charts/                        ← new: canonical tutorial .chart files
    01-simple-major.chart
    02-minor-keys.chart
    ...
  content/
    tutorial/                    ← new: tutorial pages
      index.njk                  ← landing page listing all lessons
      01-simple-major.njk
      02-minor-keys.njk
      ...
  _includes/
    base.njk                     ← unchanged
    chart-lesson.njk             ← new: layout for tutorial pages
```

The `charts/` directory lives at the website package root (not inside `content/`) so Eleventy does not attempt to render the `.chart` files as pages.

---

## How a tutorial page looks

A tutorial page is a plain Nunjucks file. The body is rendered as raw HTML (prose written by hand; no Markdown processing needed).

```njk
---
layout: chart-lesson.njk
title: Simple Major Keys
chart-name: 01-simple-major
permalink: /tutorial/simple-major/
order: 1
tags: tutorial
---
<p>
  This example shows a straightforward I–IV–V–I progression in F major.
  Notice how the normaliser rewrites A♯ to B♭, the correct diatonic spelling
  for the key.
</p>
```

Key front-matter fields:

| Field        | Purpose                                                      |
|--------------|--------------------------------------------------------------|
| `layout`     | Always `chart-lesson.njk`                                    |
| `chart-name` | Stem of the file in `charts/` (without `.chart` extension)   |
| `permalink`  | URL slug for the page                                        |
| `order`      | Integer used to sort lessons and build prev/next navigation  |
| `tags`       | Must include `tutorial` so Eleventy collects all lessons     |

---

## Layout: `_includes/chart-lesson.njk`

Extends `base.njk` and is responsible for fetching the chart source, highlighting it, and embedding the live component.

```njk
---
layout: base.njk
---
{# Prose explanation from the page body #}
{{ content | safe }}

<h2>Source</h2>
{{ chartName | highlightChart | safe }}

<h2>Normalised output</h2>
<grigson-chart normalise>
  <template>{{ chartName | readChart }}</template>
</grigson-chart>

{# Prev / next navigation #}
{% set lessons = collections.tutorial | sort(false, false, 'data.order') %}
{% set currentIndex = lessons | indexOf(page) %}
{% if currentIndex > 0 %}
  <a href="{{ lessons[currentIndex - 1].url }}">← Previous</a>
{% endif %}
{% if currentIndex < lessons.length - 1 %}
  <a href="{{ lessons[currentIndex + 1].url }}">Next →</a>
{% endif %}
```

The two key variables (`chartName | highlightChart` and `chartName | readChart`) are provided by custom Eleventy filters described below.

---

## Eleventy config additions

Three additions to `.eleventy.js`:

### 1. `readChart` filter

Reads the raw text of a chart file by stem name. Used to populate the `<template>` inside `<grigson-chart>`.

```js
import fs from 'node:fs';
import path from 'node:path';

eleventyConfig.addFilter('readChart', (name) => {
  const filePath = path.join(import.meta.dirname, 'charts', `${name}.chart`);
  return fs.readFileSync(filePath, 'utf8').trim();
});
```

### 2. `highlightChart` filter

Reads the same file and passes its contents through Shiki to produce a highlighted `<pre>` block. Shiki is already installed as a devDependency.

Because Shiki's `createHighlighter` is async, the filter is registered with `addAsyncFilter` (available in Eleventy 3.x):

```js
import { createHighlighter } from 'shiki';

// Initialise once and reuse across all pages
const highlighter = await createHighlighter({
  themes: ['nord'],
  langs: [],
});
await highlighter.loadLanguage({
  // Inline the grigson TextMate grammar so the build has no external HTTP dependency
  ...JSON.parse(fs.readFileSync(
    path.join(import.meta.dirname, '../textmate-grammar/grigson.tmLanguage.json'),
    'utf8'
  )),
  name: 'grigson',
});

eleventyConfig.addAsyncFilter('highlightChart', async (name) => {
  const source = fs.readFileSync(
    path.join(import.meta.dirname, 'charts', `${name}.chart`),
    'utf8'
  ).trim();
  return highlighter.codeToHtml(source, { lang: 'grigson', theme: 'nord' });
});
```

The highlighted HTML is injected with `| safe` in the template, so no escaping occurs.

### 3. `indexOf` filter (helper for prev/next)

Nunjucks has no built-in `indexOf` for arrays of Eleventy page objects.

```js
eleventyConfig.addFilter('indexOf', (arr, page) =>
  arr.findIndex((item) => item.url === page.url)
);
```

---

## Tutorial landing page: `content/tutorial/index.njk`

Lists all lessons in order with a short description drawn from the page title.

```njk
---
layout: base.njk
title: Tutorial
permalink: /tutorial/
---
<h1>Tutorial</h1>
<p>A step-by-step walkthrough of grigson chart features.</p>
<ol>
  {% for lesson in collections.tutorial | sort(false, false, 'data.order') %}
    <li><a href="{{ lesson.url }}">{{ lesson.data.title }}</a></li>
  {% endfor %}
</ol>
```

---

## Nav update

Add a "Tutorial" link to `_includes/base.njk` alongside the existing nav items.

---

## Suggested initial lessons

These are illustrative; the actual content is written separately.

| Order | `chart-name`              | Concept demonstrated                          |
|-------|---------------------------|-----------------------------------------------|
| 1     | `01-simple-major`         | I–IV–V–I in F major; A♯ → B♭ normalisation   |
| 2     | `02-relative-minor`       | Relative minor; detecting Am vs C major       |
| 3     | `03-borrowed-chords`      | Borrowed bVII; secondary dominant             |
| 4     | `04-sections`             | Section labels `[Verse]` / `[Chorus]`         |
| 5     | `05-harmonic-minor`       | ii°–V7–i in A harmonic minor; E7 as V7 signal |

---

## Implementation order

1. **Add `readChart` filter** to `.eleventy.js` and create the `charts/` directory with at least one example file. Verify the filter works by using it in a scratch template.

2. **Add `highlightChart` filter** (async). The Shiki initialisation should be awaited once at config time using a top-level `await` inside the `export default async function` config signature, which Eleventy 3.x supports.

3. **Create `chart-lesson.njk` layout** that calls both filters and embeds `<grigson-chart normalise>`.

4. **Write the first tutorial page** (`01-simple-major.njk`) end-to-end, including the `.chart` file. Verify the build produces a page with highlighted source and live normalised output.

5. **Add `indexOf` filter** and the prev/next navigation block. Verify with two pages.

6. **Create the tutorial index page** and add the nav link.

7. **Write remaining initial lessons** (steps 2–5 from the table above).

---

## Open questions / future work

- **Theme consistency.** The playground uses the `nord` Shiki theme. The tutorial pages will also use `nord` by default; a site-wide CSS variable for the code theme would allow easy switching later.
- **Per-section display.** A future iteration could render each section of a multi-section chart separately, with annotation explaining what's happening in each section.
- **Interactive mode.** A toggle could swap the static `<grigson-chart>` output for the full playground editor pre-loaded with the tutorial chart.
