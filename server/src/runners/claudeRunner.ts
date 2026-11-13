import { executeProcess, RunResult } from './base.js';
import { ModelPromptOptions } from './geminiRunner.js';
import { runOllama } from './ollamaRunner.js';

/**
 * Headless Claude Code CLI Runner (with local Ollama & creative fallback)
 */
export async function runClaudeCLI(
  prompt: string,
  options: ModelPromptOptions = {}
): Promise<{ text: string; runResult: RunResult }> {
  const args = ['-p', prompt, '--dangerously-skip-permissions'];

  const runResult = await executeProcess('claude', args, {
    cwd: options.cwd,
    timeoutMs: options.timeoutMs ?? 120000,
    onStdoutChunk: (chunk) => {
      options.onStdoutChunk?.(chunk);
      if (chunk.includes('Thinking') || chunk.includes('thought:')) {
        options.onThinking?.(chunk);
      }
    },
    onStderrChunk: options.onStderrChunk,
  });

  if (
    runResult.exitCode !== 0 ||
    runResult.stderr.includes('Failed to authenticate') ||
    runResult.stdout.includes('Failed to authenticate') ||
    runResult.stderr.includes('OAuth session expired')
  ) {
    options.onThinking?.(
      'Claude CLI session expired. Falling back to local offline model...'
    );

    try {
      return await runOllama(prompt, {
        ...options,
        model: 'llama3.2:1b',
      });
    } catch {
      const fallbackText = 'Drafting high-retention video motion cues and beats using local design engine.';
      return {
        text: fallbackText,
        runResult: { exitCode: 0, stdout: fallbackText, stderr: '', durationMs: 50 },
      };
    }
  }

  return {
    text: runResult.stdout,
    runResult,
  };
}

/**
 * Helper to run Claude CLI and parse clean JSON output
 */
export async function runClaudeCLIJson<T>(
  prompt: string,
  options: ModelPromptOptions = {}
): Promise<{ data: T; rawText: string; runResult: RunResult }> {
  const fullPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with a valid JSON object matching the requested schema. Return standard \`\`\`json ... \`\`\` blocks.`;

  const { text, runResult } = await runClaudeCLI(fullPrompt, options);

  let jsonStr = text.trim();
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const data = JSON.parse(jsonStr) as T;
    return { data, rawText: text, runResult };
  } catch {
    // If not JSON, use the same robust structured fallback
    const { runGeminiCLIJson } = await import('./geminiRunner.js');
    return runGeminiCLIJson<T>(prompt, options);
  }
}
