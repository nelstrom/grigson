#!/usr/bin/env node

import { runRenderer } from 'grigson';
import renderChart from './render.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: grigson-svg-renderer [file]

Reads a .chart file (or stdin if no file is given) and writes the rendered
SVG to stdout.

Options:
  --help, -h   Show this help message and exit`);
  process.exit(0);
}

const file = args.find((a: string) => !a.startsWith('-'));
await runRenderer(renderChart, { file });
