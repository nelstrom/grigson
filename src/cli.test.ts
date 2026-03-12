import { describe, it, expect, vi, afterEach } from 'vitest';
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
