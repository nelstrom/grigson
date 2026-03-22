#!/usr/bin/env node

import { fileURLToPath } from 'url';
import fs from 'node:fs';
import path from 'node:path';
import minimist from 'minimist';
import { parseSong } from './parser/parser.js';
import { normaliseSong } from './theory/normalise.js';
import { transposeSong, transposeSongToKey } from './theory/transpose.js';
import { TextRenderer } from './renderers/text.js';
import { validate } from './validator.js';
import { generateRenderer, validateRendererName } from './generate-renderer.js';

const SUBCOMMANDS = ['normalise', 'transpose', 'validate', 'generate-renderer'] as const;
type Subcommand = (typeof SUBCOMMANDS)[number];

const HELP: Record<string, string> = {
  '': `Usage: grigson <subcommand> [options]

Subcommands:
  normalise           Normalise chord spellings in a .chart file
  transpose           Transpose chords in a .chart file
  validate            Validate one or more .chart files
  generate-renderer   Scaffold a new renderer package

Options:
  --help, -h   Show this help message and exit`,

  normalise: `Usage: grigson normalise [options] [file]

Reads a .chart file (or stdin if no file is given), normalises chord
spellings to match the detected key, and writes the result to stdout.

Options:
  --key <key>          Override key detection (e.g. --key Am)
  --enharmonic <pref>  F#/Gb preference: f-sharp (default) or g-flat
  -i, --in-place       Edit the file in place instead of writing to stdout
  --help, -h           Show this help message and exit`,

  transpose: `Usage: grigson transpose [options] [file]

Reads a .chart file (or stdin if no file is given), transposes all chords
by the specified interval, and writes the result to stdout.

Options:
  --raise <n>   Transpose up by n semitones (positive integer)
  --lower <n>   Transpose down by n semitones (positive integer)
  --to <key>    Transpose to the given key (e.g. --to G)
  --help, -h    Show this help message and exit`,

  validate: `Usage: grigson validate [options] [file...]

Validates one or more .chart files (or stdin if no file is given).
Exits with code 0 if no diagnostics are found, code 1 if any are found (errors or warnings).

Options:
  --format <fmt>   Output format: text (default) or json
  --help, -h       Show this help message and exit`,

  'generate-renderer': `Usage: grigson generate-renderer <name> [options]

Scaffolds a new renderer package (grigson-<name>-renderer/) in the current
directory, or at --output <path> if specified.

Arguments:
  name             Renderer name: lowercase letters, digits, and hyphens (e.g. high-contrast)

Options:
  --output <path>  Directory in which to create the package (default: current directory)
  --help, -h       Show this help message and exit`,
};

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

function runTranspose(parsed: minimist.ParsedArgs): void {
  const filePath = parsed._[1] as string | undefined;
  const raise = parsed['raise'];
  const lower = parsed['lower'];
  const toKey = parsed['to'] as string | undefined;

  const hasRaise = raise !== undefined;
  const hasLower = lower !== undefined;
  const hasTo = toKey !== undefined;

  const intervalCount = (hasRaise ? 1 : 0) + (hasLower ? 1 : 0) + (hasTo ? 1 : 0);

  if (intervalCount > 1) {
    console.error('Error: --raise, --lower, and --to are mutually exclusive. Provide exactly one.');
    process.exit(1);
    return;
  }

  if (intervalCount === 0) {
    console.error('Error: One of --raise <n>, --lower <n>, or --to <key> must be provided.');
    process.exit(1);
    return;
  }

  const input = readInput(filePath);
  const song = parseSong(input);
  let transposed;
  if (hasTo) {
    transposed = transposeSongToKey(song, toKey!);
  } else if (hasRaise) {
    transposed = transposeSong(song, Number(raise));
  } else {
    transposed = transposeSong(song, -Number(lower));
  }
  const renderer = new TextRenderer();
  process.stdout.write(renderer.render(transposed));
}

function runValidate(parsed: minimist.ParsedArgs): void {
  const files = parsed._.slice(1) as string[];
  const format = (parsed['format'] as string | undefined) ?? 'text';

  if (format !== 'text' && format !== 'json') {
    console.error(`Error: Unknown format '${format}'.`);
    process.exit(1);
    return;
  }

  type JsonEntry = {
    file: string;
    line: number;
    character: number;
    severity: string;
    message: string;
  };

  const jsonEntries: JsonEntry[] = [];
  let hasErrors = false;

  const inputs: Array<{ label: string; source: string }> = [];

  if (files.length === 0) {
    const source = fs.readFileSync(0, 'utf8');
    inputs.push({ label: '<stdin>', source });
  } else {
    for (const file of files) {
      inputs.push({ label: file, source: fs.readFileSync(file, 'utf8') });
    }
  }

  for (const { label, source } of inputs) {
    const diagnostics = validate(source);
    for (const d of diagnostics) {
      hasErrors = true;
      if (format === 'json') {
        jsonEntries.push({
          file: label,
          line: d.range.start.line + 1,
          character: d.range.start.character + 1,
          severity: d.severity,
          message: d.message,
        });
      } else {
        const line = d.range.start.line + 1;
        const char = d.range.start.character + 1;
        console.log(`${label}:${line}:${char}: ${d.severity}: ${d.message}`);
      }
    }
  }

  if (format === 'json') {
    console.log(JSON.stringify(jsonEntries, null, 2));
  }

  if (hasErrors) {
    process.exit(1);
  }
}

function runGenerateRenderer(parsed: minimist.ParsedArgs): void {
  const name = parsed._[1] as string | undefined;
  const outputDir = (parsed['output'] as string | undefined) ?? process.cwd();

  const error = validateRendererName(name);
  if (error) {
    console.error(error);
    process.exit(1);
    return;
  }

  try {
    generateRenderer(name!, path.resolve(outputDir));
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

export function runCli(args: string[]): void {
  const parsed = minimist(args, {
    boolean: ['help', 'i', 'in-place'],
    string: ['raise', 'lower', 'to', 'key', 'enharmonic', 'output'],
    alias: { h: 'help' }
  });

  const subcommand = parsed._[0] as string | undefined;

  if (parsed['help']) {
    console.log(HELP[subcommand ?? ''] ?? HELP['']);
    process.exit(0);
    return;
  }

  if (!subcommand) {
    console.error('Error: No subcommand specified.\n');
    console.error(HELP['']);
    process.exit(1);
    return;
  }

  if (!(SUBCOMMANDS as readonly string[]).includes(subcommand)) {
    console.error(`Error: Unknown subcommand '${subcommand}'.\n`);
    console.error(HELP['']);
    process.exit(1);
    return;
  }

  switch (subcommand as Subcommand) {
    case 'normalise':
      runNormalise(parsed);
      break;
    case 'transpose':
      runTranspose(parsed);
      break;
    case 'validate':
      runValidate(parsed);
      break;
    case 'generate-renderer':
      runGenerateRenderer(parsed);
      break;
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runCli(process.argv.slice(2));
}
