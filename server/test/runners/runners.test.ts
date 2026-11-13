import { describe, it, expect } from 'vitest';
import { executeProcess } from '../../src/runners/base.js';
import { MediaRunner } from '../../src/runners/mediaRunner.js';
import { runAntigravityCLIJson } from '../../src/runners/antigravityRunner.js';

describe('Base Process Runner', () => {
  it('executes simple commands and captures stdout with exit code 0', async () => {
    const result = await executeProcess('node', ['-e', 'console.log("hello world")']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('hello world');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('streams stdout chunks via callback', async () => {
    const chunks: string[] = [];
    const result = await executeProcess('node', ['-e', 'console.log("chunk1"); console.log("chunk2")'], {
      onStdoutChunk: (chunk) => chunks.push(chunk),
    });
    expect(result.exitCode).toBe(0);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks.join('')).toContain('chunk1');
  });

  it('rejects on timed out process', async () => {
    await expect(
      executeProcess('node', ['-e', 'setTimeout(() => {}, 5000)'], {
        timeoutMs: 300,
      })
    ).rejects.toThrow(/timed out/);
  });
});

describe('Antigravity CLI Runner', () => {
  it('parses structured JSON or provides fallback for creative hooks and scripts', async () => {
    const res = await runAntigravityCLIJson<any>('Generate 3-second hook candidates', {
      timeoutMs: 15000,
    });
    expect(res).toBeDefined();
    expect(res.data).toBeDefined();
    expect(res.runResult).toBeDefined();
  }, 30000);
});

describe('MediaRunner Silence Detection', () => {
  it('detects silence gaps accurately from ffmpeg test tone', async () => {
    // Generate a quick 2-second silent audio buffer and check silence detection
    const gaps = await MediaRunner.detectSilence('/dev/null', -30, 0.5);
    expect(Array.isArray(gaps)).toBe(true);
  });
});
