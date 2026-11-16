import { executeProcess, RunResult } from './base.js';
import { ModelPromptOptions } from './antigravityRunner.js';

export interface OllamaOptions extends ModelPromptOptions {
  host?: string; // defaults to http://127.0.0.1:11434
  model?: string; // defaults to "llama3.2" or first available model
}

/**
 * Local Ollama Runner
 * First attempts fast streaming via HTTP API; falls back to CLI execution.
 */
export async function runOllama(
  prompt: string,
  options: OllamaOptions = {}
): Promise<{ text: string; runResult: RunResult }> {
  const host = options.host ?? 'http://127.0.0.1:11434';
  const model = options.model ?? 'llama3.2';
  const startTime = Date.now();

  try {
    // Attempt HTTP API call
    const timeout = AbortSignal.timeout(options.timeoutMs ?? 120000);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    const res = await fetch(`${host}/api/generate`, {
      signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { response?: string };
      const text = data.response ?? '';
      options.onStdoutChunk?.(text);

      return {
        text,
        runResult: {
          exitCode: 0,
          stdout: text,
          stderr: '',
          durationMs: Date.now() - startTime,
        },
      };
    }
  } catch (httpErr) {
    if (options.signal?.aborted) throw new Error('Job canceled');
    // HTTP fetch failed, fallback to CLI
  }

  // Fallback to CLI: ollama run <model> "<prompt>"
  const runResult = await executeProcess('ollama', ['run', model, prompt], {
    signal: options.signal,
    cwd: options.cwd,
    timeoutMs: options.timeoutMs ?? 180000,
    onStdoutChunk: options.onStdoutChunk,
    onStderrChunk: options.onStderrChunk,
  });

  if (runResult.exitCode !== 0) {
    throw new Error(
      `Ollama execution failed with exit code ${runResult.exitCode}: ${runResult.stderr || runResult.stdout}`
    );
  }

  return {
    text: runResult.stdout,
    runResult,
  };
}
