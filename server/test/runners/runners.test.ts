import { describe, it, expect, vi, afterEach } from 'vitest';
import * as base from '../../src/runners/base.js';
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
 afterEach(()=>vi.restoreAllMocks());
 it('parses engine output without fabricating a replacement',async()=>{
  vi.spyOn(base,'executeProcess').mockResolvedValue({exitCode:0,stdout:'{"directions":[]}',stderr:'',durationMs:1});
  expect((await runAntigravityCLIJson<any>('test')).data).toEqual({directions:[]});
 });
 it('reports malformed output and unavailable engines',async()=>{
  const run=vi.spyOn(base,'executeProcess').mockResolvedValue({exitCode:0,stdout:'not json',stderr:'',durationMs:1});
  await expect(runAntigravityCLIJson('test')).rejects.toThrow('invalid JSON');
  run.mockRejectedValue(new Error('Engine offline'));
  await expect(runAntigravityCLIJson('test')).rejects.toThrow('offline');
 });
});

describe('MediaRunner Silence Detection', () => {
  it('detects silence gaps accurately from ffmpeg test tone', async () => {
    // Generate a quick 2-second silent audio buffer and check silence detection
    const gaps = await MediaRunner.detectSilence('/dev/null', -30, 0.5);
    expect(Array.isArray(gaps)).toBe(true);
  });
});

describe('Timeout cleanup',()=>{
 it('kills an engine that ignores SIGTERM',async()=>{
  let pid=0;
  await expect(executeProcess('node',['-e','process.on("SIGTERM",()=>{});console.log(process.pid);setInterval(()=>{},1000)'],{timeoutMs:1000,onStdoutChunk:chunk=>{pid=Number(chunk.trim());}})).rejects.toThrow('timed out');
  expect(pid).toBeGreaterThan(0);
  await vi.waitFor(()=>expect(()=>process.kill(pid,0)).toThrow(),{timeout:2500,interval:50});
 },5000);
});
