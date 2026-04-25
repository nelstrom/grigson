import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCli } from './cli.js';

// Track tmpDirs created during generate-renderer tests for cleanup
const tmpDirsToClean: string[] = [];

describe('CLI', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits with code 1 for an unknown subcommand', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    runCli(['totally-unknown-subcommand']);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 0 and prints top-level usage for --help', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    runCli(['--help']);

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Subcommands:'));
  });

  it('exits with code 0 and prints top-level usage for -h', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    runCli(['-h']);

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Subcommands:'));
  });

  it('exits with code 0 and prints normalise-specific help for normalise --help', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    runCli(['normalise', '--help']);

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('--in-place'));
  });

  it('exits with code 1 when no subcommand is provided', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    runCli([]);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('CLI normalise subcommand', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes normalised .chart text to stdout when given a file argument', () => {
    const tmpFile = path.join(os.tmpdir(), 'test-normalise.chart');
    fs.writeFileSync(tmpFile, '| A# | F | C |\n', 'utf8');

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    runCli(['normalise', tmpFile]);

    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain('Bb');
    fs.unlinkSync(tmpFile);
  });

  it('reads from stdin when no file argument is given', () => {
    const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      if (path === 0) return '| C | Am | F | G |\n';
      throw new Error('unexpected path');
    });
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    runCli(['normalise']);

    expect(readSpy).toHaveBeenCalledWith(0, 'utf8');
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it('overrides key detection when --key is provided', () => {
    const tmpFile = path.join(os.tmpdir(), 'test-normalise-key.chart');
    fs.writeFileSync(tmpFile, '| C | Am | F | G |\n', 'utf8');

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    runCli(['normalise', '--key', 'Am', tmpFile]);

    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain('key: A minor');
    fs.unlinkSync(tmpFile);
  });

  it('forwards --enharmonic g-flat to normaliseSong config', () => {
    const tmpFile = path.join(os.tmpdir(), 'test-normalise-enharmonic.chart');
    fs.writeFileSync(tmpFile, '| F# | C# | D#m | B |\n', 'utf8');

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    runCli(['normalise', '--enharmonic', 'g-flat', tmpFile]);

    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain('Gb');
    fs.unlinkSync(tmpFile);
  });

  it('edits the file in place with -i and produces no stdout', () => {
    const tmpFile = path.join(os.tmpdir(), 'test-normalise-inplace.chart');
    fs.writeFileSync(tmpFile, '| A# | F | C |\n', 'utf8');

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    runCli(['normalise', '-i', tmpFile]);

    expect(stdoutSpy).not.toHaveBeenCalled();
    const written = fs.readFileSync(tmpFile, 'utf8');
    expect(written).toContain('Bb');
    fs.unlinkSync(tmpFile);
  });

  it('exits with code 1 and an error message when -i is used without a file argument', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    runCli(['normalise', '-i']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('-i'));
  });
});

describe('CLI transpose subcommand', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('transposes all chords up a whole step with --raise 2', () => {
    const tmpFile = path.join(os.tmpdir(), 'test-transpose-raise.chart');
    fs.writeFileSync(tmpFile, '| C | F | G | C |\n', 'utf8');

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    runCli(['transpose', '--raise', '2', tmpFile]);

    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain('| D |');
    expect(output).toContain('| G |');
    fs.unlinkSync(tmpFile);
  });

  it('transposes down a minor third with --lower 3', () => {
    const tmpFile = path.join(os.tmpdir(), 'test-transpose-lower.chart');
    fs.writeFileSync(tmpFile, '| C | F | G | C |\n', 'utf8');

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    runCli(['transpose', '--lower', '3', tmpFile]);

    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain('| A |');
    fs.unlinkSync(tmpFile);
  });

  it('transposes to the given key with --to G', () => {
    const tmpFile = path.join(os.tmpdir(), 'test-transpose-to.chart');
    fs.writeFileSync(tmpFile, '| C | F | G | C |\n', 'utf8');

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    runCli(['transpose', '--to', 'G', tmpFile]);

    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain('key: G');
    fs.unlinkSync(tmpFile);
  });

  it('exits with a non-zero code when both --raise and --to are provided', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    runCli(['transpose', '--raise', '2', '--to', 'G']);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with a non-zero code when neither --raise, --lower, nor --to is provided', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    runCli(['transpose']);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('reads from stdin when no file argument is given', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (p === 0) return '| C | Am | F | G |\n';
      throw new Error('unexpected path');
    });
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    runCli(['transpose', '--raise', '7']);

    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain('| G |');
  });
});

describe('CLI validate subcommand', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits with code 0 for a valid .chart file', () => {
    const tmpFile = path.join(os.tmpdir(), 'test-validate-valid.chart');
    fs.writeFileSync(tmpFile, '| C | Am | F | G |\n', 'utf8');

    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);

    runCli(['validate', tmpFile]);

    expect(exitSpy).not.toHaveBeenCalled();
    fs.unlinkSync(tmpFile);
  });

  it('exits with code 1 and prints filename and line number for a file with a parse error', () => {
    const tmpFile = path.join(os.tmpdir(), 'test-validate-invalid.chart');
    fs.writeFileSync(tmpFile, '| Caug |\n', 'utf8');

    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    runCli(['validate', tmpFile]);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain(tmpFile);
    expect(output).toMatch(/:\d+:/);
    fs.unlinkSync(tmpFile);
  });

  it('reads from stdin when no file argument is given', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (p === 0) return '| C | Am |\n';
      throw new Error('unexpected path');
    });
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);

    runCli(['validate']);

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits with code 0 and prints [] for a valid file with --format json', () => {
    const tmpFile = path.join(os.tmpdir(), 'test-validate-json-valid.chart');
    fs.writeFileSync(tmpFile, '| C | F | G |\n', 'utf8');

    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    runCli(['validate', '--format', 'json', tmpFile]);

    expect(exitSpy).not.toHaveBeenCalled();
    const output = logSpy.mock.calls[0][0] as string;
    expect(JSON.parse(output)).toEqual([]);
    fs.unlinkSync(tmpFile);
  });

  it('exits with code 1 and prints JSON array with error entry for an invalid file with --format json', () => {
    const tmpFile = path.join(os.tmpdir(), 'test-validate-json-invalid.chart');
    fs.writeFileSync(tmpFile, '| Caug |\n', 'utf8');

    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    runCli(['validate', '--format', 'json', tmpFile]);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = logSpy.mock.calls[0][0] as string;
    const entries = JSON.parse(output) as Array<{
      file: string;
      line: number;
      character: number;
      severity: string;
      message: string;
    }>;
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]).toMatchObject({
      file: tmpFile,
      severity: 'error',
    });
    expect(typeof entries[0].line).toBe('number');
    expect(typeof entries[0].character).toBe('number');
    expect(typeof entries[0].message).toBe('string');
    fs.unlinkSync(tmpFile);
  });
});

describe('CLI generate-renderer subcommand', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const d of tmpDirsToClean) {
      if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    }
    tmpDirsToClean.length = 0;
  });

  it('exits with code 1 when no name is provided', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    runCli(['generate-renderer']);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 for an invalid name', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    runCli(['generate-renderer', 'Invalid-Name']);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('creates the package directory with --output and logs "Created" and "pnpm install"', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grigson-cli-gen-'));
    tmpDirsToClean.push(tmpDir);

    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    runCli(['generate-renderer', 'my-renderer', '--output', tmpDir]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(tmpDir, 'grigson-my-renderer-renderer'))).toBe(true);
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('Created');
    expect(output).toContain('pnpm install');
  });

  it('exits with code 0 and prints scaffold help for generate-renderer --help', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    runCli(['generate-renderer', '--help']);

    expect(exitSpy).toHaveBeenCalledWith(0);
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('generate-renderer');
    expect(output).toContain('--output');
  });
});
