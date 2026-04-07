#!/usr/bin/env node
/**
 * Re-encodes FinaleJazz.otf as GrigsonJazz.otf by adding standard Unicode
 * cmap entries that point to the existing SMuFL glyph outlines:
 *
 *   U+266D ♭  →  uniE260  (SMuFL accidentalFlat)
 *   U+266E ♮  →  uniE261  (SMuFL accidentalNatural)
 *   U+266F ♯  →  uniE262  (SMuFL accidentalSharp)
 *   U+25B3 △  →  uniE873  (SMuFL chordSymbolMajorSeventh)
 *
 * The existing SMuFL entries are left intact.  The font is renamed from
 * "Finale Jazz" to "GrigsonJazz" to satisfy the SIL OFL reserved-name
 * requirement for derivatives.
 *
 * Prerequisites:  pip install fonttools
 * Usage:          node scripts/reencode-finale-jazz.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(__dirname, 'fonts');
const src  = join(FONTS_DIR, 'FinaleJazz.otf');
const dest = join(FONTS_DIR, 'GrigsonJazz.otf');

const pyScript = `\
from fontTools.ttLib import TTFont

font = TTFont(${JSON.stringify(src)})

new_mappings = {
    0x266D: 'uniE260',   # flat
    0x266E: 'uniE261',   # natural
    0x266F: 'uniE262',   # sharp
    0x25B3: 'uniE873',   # major-seventh triangle
}

for table in font['cmap'].tables:
    table.cmap.update(new_mappings)

REPLACEMENTS = [('Finale Jazz', 'GrigsonJazz'), ('FinaleJazz', 'GrigsonJazz')]
for record in font['name'].names:
    try:
        s = record.toUnicode()
    except Exception:
        # Fall back to raw bytes replacement for records that can't be decoded
        raw = record.string
        for orig, repl in REPLACEMENTS:
            for enc in ('utf-16-be', 'latin-1', 'ascii'):
                try:
                    raw = raw.replace(orig.encode(enc), repl.encode(enc))
                except Exception:
                    pass
        record.string = raw
        continue
    new_s = s
    for orig, repl in REPLACEMENTS:
        new_s = new_s.replace(orig, repl)
    if new_s != s:
        encoding = 'utf-16-be' if record.platformID in (0, 3) else 'latin-1'
        try:
            record.string = new_s.encode(encoding)
        except UnicodeEncodeError:
            record.string = new_s.encode('utf-16-be')

font.save(${JSON.stringify(dest)})
print('Saved', ${JSON.stringify(dest)})
`;

const tmpPy = join(tmpdir(), 'reencode-finale-jazz.py');
writeFileSync(tmpPy, pyScript, 'utf8');
try {
  execSync(`python3 "${tmpPy}"`, { stdio: 'inherit' });
} finally {
  unlinkSync(tmpPy);
}
