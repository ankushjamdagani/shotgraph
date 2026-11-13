import { executeProcess, RunOptions, RunResult } from './base.js';
import { ModelPromptOptions } from './geminiRunner.js';

/**
 * Headless Claude Code CLI Runner
 * Runs non-interactively using `claude -p "<prompt>" --dangerously-skip-permissions`
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

  if (runResult.exitCode !== 0) {
    throw new Error(
      `Claude Code CLI exited with code ${runResult.exitCode}: ${runResult.stderr || runResult.stdout}`
    );
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
  } catch (err) {
    throw new Error(`Failed to parse JSON from Claude CLI output: ${(err as Error).message}\nRaw output was:\n${text}`);
  }
}
