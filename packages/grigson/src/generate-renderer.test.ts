import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateRendererName, generateRenderer } from './generate-renderer.js';

describe('validateRendererName', () => {
  it('returns null for a valid single-word name', () => {
    expect(validateRendererName('highcontrast')).toBeNull();
  });

  it('returns null for a valid hyphenated name', () => {
    expect(validateRendererName('high-contrast')).toBeNull();
  });

  it('returns null for a name with digits', () => {
    expect(validateRendererName('my-renderer2')).toBeNull();
  });

  it('returns error for undefined', () => {
    expect(validateRendererName(undefined)).toContain('required');
  });

  it('returns error for empty string', () => {
    expect(validateRendererName('')).toContain('required');
  });

  it('returns error for uppercase letters', () => {
    expect(validateRendererName('HighContrast')).toContain('lowercase');
  });

  it('returns error for leading hyphen', () => {
    expect(validateRendererName('-high')).toContain('lowercase');
  });

  it('returns error for trailing hyphen', () => {
    expect(validateRendererName('high-')).toContain('lowercase');
  });

  it('returns error for consecutive hyphens', () => {
    expect(validateRendererName('high--contrast')).toContain('lowercase');
  });

  it('returns error for reserved name "svg"', () => {
    expect(validateRendererName('svg')).toContain('already exists');
  });

  it('returns error for reserved name "text"', () => {
    expect(validateRendererName('text')).toContain('already exists');
  });

  it('returns error for reserved name "html"', () => {
    expect(validateRendererName('html')).toContain('already exists');
  });
});

describe('generateRenderer', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates the output directory with 11 files', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grigson-gen-test-'));
    generateRenderer('high-contrast', tmpDir);

    const packageDir = path.join(tmpDir, 'grigson-high-contrast-renderer');
    expect(fs.existsSync(packageDir)).toBe(true);

    const expectedFiles = [
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'vitest.config.ts',
      'README.md',
      'src/element.ts',
      'src/index.ts',
      'src/index.browser.ts',
      'src/register.ts',
      'src/render.ts',
      'src/cli.ts',
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(packageDir, file)), `missing ${file}`).toBe(true);
    }
  });

  it('package.json has correct name and bin', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grigson-gen-test-'));
    generateRenderer('high-contrast', tmpDir);

    const pkg = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'grigson-high-contrast-renderer', 'package.json'), 'utf8'),
    ) as { name: string; bin: Record<string, string> };

    expect(pkg.name).toBe('grigson-high-contrast-renderer');
    expect(pkg.bin['grigson-high-contrast-renderer']).toBe('./dist/cli.js');
  });

  it('tsconfig.json is valid JSON', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grigson-gen-test-'));
    generateRenderer('high-contrast', tmpDir);

    const content = fs.readFileSync(
      path.join(tmpDir, 'grigson-high-contrast-renderer', 'tsconfig.json'),
      'utf8',
    );
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('src/element.ts contains the correct class name', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grigson-gen-test-'));
    generateRenderer('high-contrast', tmpDir);

    const content = fs.readFileSync(
      path.join(tmpDir, 'grigson-high-contrast-renderer', 'src/element.ts'),
      'utf8',
    );
    expect(content).toContain('class GrigsonHighContrastRenderer');
  });

  it('src/register.ts contains the correct element tag', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grigson-gen-test-'));
    generateRenderer('high-contrast', tmpDir);

    const content = fs.readFileSync(
      path.join(tmpDir, 'grigson-high-contrast-renderer', 'src/register.ts'),
      'utf8',
    );
    expect(content).toContain("'grigson-high-contrast-renderer'");
  });

  it('vite.config.ts contains correct lib names', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grigson-gen-test-'));
    generateRenderer('high-contrast', tmpDir);

    const content = fs.readFileSync(
      path.join(tmpDir, 'grigson-high-contrast-renderer', 'vite.config.ts'),
      'utf8',
    );
    expect(content).toContain('grigsonHighContrastRenderer');
    expect(content).toContain('grigsonHighContrastRendererRegister');
  });

  it('throws if the output directory already exists', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grigson-gen-test-'));
    generateRenderer('my-renderer', tmpDir);
    expect(() => generateRenderer('my-renderer', tmpDir)).toThrow('already exists');
  });
});
