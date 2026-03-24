#!/usr/bin/env node

import minimist from 'minimist';
import { HtmlRenderer } from './renderers/html.js';
import type { TextRendererConfig } from './renderers/text.js';
import { runRenderer } from './run-renderer.js';

const HELP = `Usage: grigson-html-renderer [options] [file]

Reads a .chart file (or stdin if no file is given) and writes the rendered
HTML to stdout. No normalisation is performed.

Options:
  --notation-preset <preset>  Chord notation style: jazz (default), pop, or symbolic
  --help, -h                  Show this help message and exit`;

const parsed = minimist(process.argv.slice(2), {
  string: ['notation-preset'],
  boolean: ['help'],
  alias: { h: 'help' },
});

if (parsed['help']) {
  console.log(HELP);
  process.exit(0);
}

const config: TextRendererConfig = {};
const preset = parsed['notation-preset'] as string | undefined;
if (preset) {
  config.notation = { preset: preset as 'jazz' | 'pop' | 'symbolic' };
}

await runRenderer((song) => new HtmlRenderer(config).render(song), {
  file: parsed._[0] as string | undefined,
});
