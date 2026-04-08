import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(__dirname, 'fonts');

let files;
try {
  files = readdirSync(fontsDir).filter((f) => f.endsWith('.json'));
} catch {
  files = [];
}

export default files.map((file) => {
  const raw = readFileSync(join(fontsDir, file), 'utf8');
  return JSON.parse(raw);
});
