import fs from 'node:fs';
import type { Song } from './parser/types.js';
import { parseSong } from './parser/parser.js';

type RenderFn = (song: Song) => string;

export interface RunRendererOptions {
  /** Path to a .chart file. If omitted, reads from stdin. */
  file?: string;
}

export async function runRenderer(render: RenderFn, options?: RunRendererOptions): Promise<void> {
  let input: string;
  try {
    input = options?.file
      ? fs.readFileSync(options.file, 'utf8')
      : fs.readFileSync(0, 'utf8');
  } catch (err) {
    process.stderr.write(`Error reading input: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  let song: Song;
  try {
    song = parseSong(input);
  } catch (err) {
    process.stderr.write(`Parse error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  let output: string;
  try {
    output = render(song);
  } catch (err) {
    process.stderr.write(`Render error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  process.stdout.write(output);
}
