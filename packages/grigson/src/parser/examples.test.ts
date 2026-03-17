import { describe, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSong } from './parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(__dirname, '../../documentation/examples');
const chartFiles = readdirSync(examplesDir).filter((f) => f.endsWith('.chart'));

describe('example .chart files parse without errors', () => {
  for (const file of chartFiles) {
    it(file, () => {
      const source = readFileSync(join(examplesDir, file), 'utf8');
      parseSong(source);
    });
  }
});
