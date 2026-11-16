import { executeProcess, RunResult } from './base.js';
import { ModelPromptOptions } from './antigravityRunner.js';
import { runOllama } from './ollamaRunner.js';
/**
 * Headless Claude Code CLI Runner (with local Ollama & creative fallback)
 */
export async function runClaudeCLI(prompt: string, options: ModelPromptOptions = {}): Promise<{
    text: string;
    runResult: RunResult;
}> {
    const runResult = await executeProcess('claude', ['-p', prompt], { ...options, timeoutMs: options.timeoutMs ?? 120000 });
    if (runResult.exitCode !== 0)
        throw new Error('Claude failed. Check the engine installation and authentication. ' + runResult.stderr);
    return { text: runResult.stdout, runResult };
}
export async function runClaudeCLIJson<T>(prompt: string, options: ModelPromptOptions = {}): Promise<{
    data: T;
    rawText: string;
    runResult: RunResult;
}> {
    const { text, runResult } = await runClaudeCLI(prompt + '\nReturn only valid JSON.', options);
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    try {
        return { data: JSON.parse(match?.[1] || text), rawText: text, runResult };
    }
    catch {
        throw new Error('Claude returned invalid JSON. Retry or choose another engine.');
    }
}
