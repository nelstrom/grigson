#!/usr/bin/env node

import { fileURLToPath } from 'url';
import minimist from 'minimist';

const SUBCOMMANDS = ['normalise', 'render', 'transpose'] as const;
type Subcommand = (typeof SUBCOMMANDS)[number];

const HELP = `Usage: grigson <subcommand> [options]

Subcommands:
  normalise    Normalise chord spellings in a .chart file
  render       Render a .chart file to plain text
  transpose    Transpose chords in a .chart file

Options:
  --help, -h   Show this help message and exit`;

export function runCli(args: string[]): void {
  const parsed = minimist(args, { boolean: ['help'], alias: { h: 'help' } });

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
      console.error("Error: 'normalise' subcommand not yet implemented.");
      process.exit(1);
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
