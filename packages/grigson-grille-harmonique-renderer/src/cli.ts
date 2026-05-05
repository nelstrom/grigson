#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import minimist from 'minimist';
import { runRenderer } from 'grigson';
import type { NotationPreset } from 'grigson';
import render, { type GrilleConfig } from './render.js';
import { getGrilleStyles } from './styles.js';

const HELP = `Usage: grigson-grille-harmonique-renderer [options] [file]

Reads a .chart file (or stdin if no file is given) and writes the rendered
HTML to stdout.

Options:
  --format <fmt>                Output format: "html" (default) or "standalone"
  --notation-preset <name>      Named preset (e.g. "realbook")
  --notation-preset-file <path> JSON file with partial NotationPreset
  --bars-per-line <n>           Bars per row (default: 4)
  --accidentals <mode>          "unicode" (default) or "ascii"
  --help, -h                    Show this help message and exit`;

const parsed = minimist(process.argv.slice(2), {
  string: ['format', 'notation-preset', 'notation-preset-file', 'accidentals', 'bars-per-line'],
  boolean: ['help'],
  alias: { h: 'help' },
});

if (parsed['help']) {
  console.log(HELP);
  process.exit(0);
}

const rawFormat = parsed['format'] as string | undefined;
if (rawFormat !== undefined && rawFormat !== 'html' && rawFormat !== 'standalone') {
  process.stderr.write(`Invalid --format value "${rawFormat}". Expected "html" or "standalone".\n`);
  process.exit(1);
}
const format = (rawFormat ?? 'html') as 'html' | 'standalone';

const config: GrilleConfig = {};

const presetFile = parsed['notation-preset-file'] as string | undefined;
const presetName = parsed['notation-preset'] as string | undefined;
if (presetFile) {
  const raw = readFileSync(presetFile, 'utf8');
  config.notation = { preset: JSON.parse(raw) as Partial<NotationPreset> };
} else if (presetName) {
  config.notation = { preset: presetName };
}

const barsPerLineStr = parsed['bars-per-line'] as string | undefined;
const barsPerLine = barsPerLineStr ? parseInt(barsPerLineStr, 10) : NaN;
if (!isNaN(barsPerLine) && barsPerLine > 0) config.barsPerLine = barsPerLine;

const accidentals = parsed['accidentals'] as string | undefined;
if (accidentals === 'unicode' || accidentals === 'ascii') config.accidentals = accidentals;

if (format === 'standalone') {
  await runRenderer(
    (song) => {
      const chartHTML = render(song, config);
      return [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        `<style>body { background: #fff; color: #000; padding: 2rem; font-family: serif; }`,
        `${getGrilleStyles()}</style>`,
        '</head>',
        '<body>',
        chartHTML,
        '</body>',
        '</html>',
      ].join('\n');
    },
    { file: parsed._[0] as string | undefined },
  );
} else {
  await runRenderer((song) => render(song, config), { file: parsed._[0] as string | undefined });
}
