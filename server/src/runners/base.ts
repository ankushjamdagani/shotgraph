import { spawn, ChildProcess } from 'child_process';

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  onStdoutChunk?: (chunk: string) => void;
  onStderrChunk?: (chunk: string) => void;
  signal?: AbortSignal;
  onThinking?: (thought: string) => void;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

/**
 * Robust process executor for local CLIs.
 * Captures stdout and stderr, streams deltas in real-time,
 * and enforces strict timeout boundaries.
 */
export async function executeProcess(
  command: string,
  args: string[],
  options: RunOptions = {}
): Promise<RunResult> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs ?? 180000; // 3 minutes default

  return new Promise((resolve, reject) => {
    let proc: ChildProcess;
    let timer: NodeJS.Timeout | null = null;
    let stdout = '';
    let stderr = '';
    let escalation: NodeJS.Timeout | null = null;
    let stopped = false;
    const terminate = () => {
      if (!proc || proc.exitCode !== null || proc.signalCode !== null) return;
      const signal = (sig: NodeJS.Signals) => { try { if (process.platform !== 'win32' && proc.pid) process.kill(-proc.pid, sig); else proc.kill(sig); } catch {} };
      signal('SIGTERM');
      escalation = setTimeout(() => signal('SIGKILL'), 1000);
    };
    const abort = () => { stopped = true; terminate(); reject(new Error('Job canceled')); };
    options.signal?.addEventListener('abort', abort, { once: true });

    try {
      proc = spawn(command, args, {
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
          NO_COLOR: '1',
          CI: '1',
        },
        shell: false,
        detached: process.platform !== 'win32',
      });
    } catch (err) {
      return reject(new Error(`Failed to spawn process "${command}": ${(err as Error).message}`));
    }

    timer = setTimeout(() => {
      stopped = true;
      terminate();
      reject(new Error(`Process "${command} ${args.join(' ')}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      stdout += text;
      options.onStdoutChunk?.(text);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      stderr += text;
      options.onStderrChunk?.(text);
    });

    proc.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (escalation) clearTimeout(escalation);
      options.signal?.removeEventListener('abort', abort);
      if (stopped) return;
      resolve({
        exitCode: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        durationMs: Date.now() - startTime,
      });
    });

    if (options.signal?.aborted) abort();
    proc.on('error', (err) => {
      options.signal?.removeEventListener('abort', abort);
      if (timer) clearTimeout(timer);
      reject(new Error(`Process error in "${command}": ${err.message}`));
    });
  });
}
