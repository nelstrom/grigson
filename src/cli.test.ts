import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCli } from './cli.js';

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

  it('exits with code 0 and prints usage for --help', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    runCli(['--help']);

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  it('exits with code 0 and prints usage for -h', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    runCli(['-h']);

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
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

    const output = (stdoutSpy.mock.calls[0][0] as string);
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
    expect(output).toContain('key: Am');
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
