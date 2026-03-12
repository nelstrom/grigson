#!/usr/bin/env node

import { fileURLToPath } from 'url';
import fs from 'node:fs';
import minimist from 'minimist';
import { parseSong } from './parser/parser.js';
import { normaliseSong } from './theory/normalise.js';
import { TextRenderer } from './renderers/text.js';

const SUBCOMMANDS = ['normalise', 'render', 'transpose'] as const;
type Subcommand = (typeof SUBCOMMANDS)[number];

const HELP = `Usage: grigson <subcommand> [options]

Subcommands:
  normalise    Normalise chord spellings in a .chart file
  render       Render a .chart file to plain text
  transpose    Transpose chords in a .chart file

Options:
  --help, -h   Show this help message and exit`;

function readInput(filePath: string | undefined): string {
  if (filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }
  return fs.readFileSync(0, 'utf8');
}

function runNormalise(parsed: minimist.ParsedArgs): void {
  const filePath = parsed._[1] as string | undefined;
  const key = parsed['key'] as string | undefined;
  const enharmonic = parsed['enharmonic'] as string | undefined;
  const inPlace: boolean = parsed['i'] === true || parsed['in-place'] === true;

  if (inPlace && !filePath) {
    console.error('Error: -i/--in-place requires a file argument.');
    process.exit(1);
    return;
  }

  const input = readInput(filePath);
  const song = parseSong(input);

  const config: { fSharpOrGFlat?: 'f-sharp' | 'g-flat'; forceKey?: string } = {};
  if (key) config.forceKey = key;
  if (enharmonic === 'g-flat') config.fSharpOrGFlat = 'g-flat';
  else if (enharmonic === 'f-sharp') config.fSharpOrGFlat = 'f-sharp';

  const normalised = normaliseSong(song, config);
  const renderer = new TextRenderer();
  const output = renderer.render(normalised);

  if (inPlace && filePath) {
    fs.writeFileSync(filePath, output, 'utf8');
  } else {
    process.stdout.write(output);
  }
}

export function runCli(args: string[]): void {
  const parsed = minimist(args, { boolean: ['help', 'i', 'in-place'], alias: { h: 'help' } });

  if (parsed['help']) {
    console.log(HELP);
    process.exit(0);
    return;
  }

  const subcommand = parsed._[0];

  if (!subcommand) {
    console.error('Error: No subcommand specified.\n');
    console.error(HELP);
    process.exit(1);
    return;
  }

  if (!(SUBCOMMANDS as readonly string[]).includes(subcommand)) {
    console.error(`Error: Unknown subcommand '${subcommand}'.\n`);
    console.error(HELP);
    process.exit(1);
    return;
  }

  switch (subcommand as Subcommand) {
    case 'normalise':
      runNormalise(parsed);
      break;
    case 'render':
      console.error("Error: 'render' subcommand not yet implemented.");
      process.exit(1);
      break;
    case 'transpose':
      console.error("Error: 'transpose' subcommand not yet implemented.");
      process.exit(1);
      break;
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runCli(process.argv.slice(2));
}
