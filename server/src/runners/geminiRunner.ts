import { executeProcess, RunOptions, RunResult } from './base.js';

export interface ModelPromptOptions extends RunOptions {
  systemPrompt?: string;
  temperature?: number;
  model?: string; // e.g. "gemini-2.5-pro", "gemini-2.5-flash"
}

/**
 * Headless Gemini CLI Runner (Default Engine)
 * Runs non-interactively using `gemini -p "<prompt>" -y`
 */
export async function runGeminiCLI(
  prompt: string,
  options: ModelPromptOptions = {}
): Promise<{ text: string; runResult: RunResult }> {
  const args = ['-p', prompt, '-y'];

  if (options.model) {
    args.push('-m', options.model);
  }

  const runResult = await executeProcess('gemini', args, {
    cwd: options.cwd,
    timeoutMs: options.timeoutMs ?? 120000,
    onStdoutChunk: (chunk) => {
      options.onStdoutChunk?.(chunk);
      // Gemini CLI often tags thinking or progress
      if (chunk.includes('Thinking') || chunk.includes('thought:')) {
        options.onThinking?.(chunk);
      }
    },
    onStderrChunk: options.onStderrChunk,
  });

  if (runResult.exitCode !== 0) {
    throw new Error(
      `Gemini CLI exited with code ${runResult.exitCode}: ${runResult.stderr || runResult.stdout}`
    );
  }

  return {
    text: runResult.stdout,
    runResult,
  };
}

/**
 * Helper to run Gemini CLI and parse clean JSON output from markdown fences or bare text
 */
export async function runGeminiCLIJson<T>(
  prompt: string,
  options: ModelPromptOptions = {}
): Promise<{ data: T; rawText: string; runResult: RunResult }> {
  const fullPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with a valid JSON object matching the requested schema. Do not enclose in markdown ticks if possible, or use standard \`\`\`json ... \`\`\` blocks.`;

  const { text, runResult } = await runGeminiCLI(fullPrompt, options);

  let jsonStr = text.trim();
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const data = JSON.parse(jsonStr) as T;
    return { data, rawText: text, runResult };
  } catch (err) {
    throw new Error(`Failed to parse JSON from Gemini CLI output: ${(err as Error).message}\nRaw output was:\n${text}`);
  }
}
