#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import minimist from 'minimist';
import { HtmlRenderer } from './renderers/html.js';
import type { TextRendererConfig } from './renderers/text.js';
import type { NotationPreset } from './notation/registry.js';
import { runRenderer } from './run-renderer.js';

const HELP = `Usage: grigson-html-renderer [options] [file]

Reads a .chart file (or stdin if no file is given) and writes the rendered
HTML to stdout. No normalisation is performed.

Options:
  --notation-preset <name>        Named notation preset (e.g. "jazz")
  --notation-preset-file <path>   Path to a JSON file containing a partial NotationPreset object
  --simile-output <mode>          Simile rendering: "shorthand" (use % glyph) or "longhand" (default)
  --accidentals <mode>            Accidental symbols: "unicode" (♭♯, default) or "ascii" (b#)
  --help, -h                      Show this help message and exit`;

const parsed = minimist(process.argv.slice(2), {
  string: ['notation-preset', 'notation-preset-file', 'simile-output', 'accidentals'],
  boolean: ['help'],
  alias: { h: 'help' },
});

if (parsed['help']) {
  console.log(HELP);
  process.exit(0);
}

const config: TextRendererConfig = {};
const presetName = parsed['notation-preset'] as string | undefined;
const presetFile = parsed['notation-preset-file'] as string | undefined;
if (presetFile) {
  const raw = readFileSync(presetFile, 'utf8');
  config.notation = { preset: JSON.parse(raw) as Partial<NotationPreset> };
} else if (presetName) {
  config.notation = { preset: presetName };
}
const simileOutput = parsed['simile-output'] as string | undefined;
if (simileOutput === 'shorthand' || simileOutput === 'longhand') {
  config.simile = { output: simileOutput };
}
const accidentals = parsed['accidentals'] as string | undefined;
if (accidentals === 'unicode' || accidentals === 'ascii') {
  config.accidentals = accidentals;
}

await runRenderer((song) => new HtmlRenderer(config).render(song), {
  file: parsed._[0] as string | undefined,
});
