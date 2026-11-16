import { executeProcess, RunOptions, RunResult } from './base.js';
import { runOllama } from './ollamaRunner.js';
export interface ModelPromptOptions extends RunOptions {
    systemPrompt?: string;
    temperature?: number;
    model?: string;
    effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}
const AGY_BIN_PATH = process.env.AGY_BIN_PATH || 'agy';
/**
 * Headless Antigravity CLI Runner (Default Engine)
 * Runs non-interactively using `agy -p "<prompt>" --dangerously-skip-permissions`
 */
export async function runAntigravityCLI(prompt: string, options: ModelPromptOptions = {}): Promise<{
    text: string;
    runResult: RunResult;
}> {
    const runResult = await executeProcess(AGY_BIN_PATH, ['-p', prompt], { ...options, timeoutMs: options.timeoutMs ?? 120000 });
    if (runResult.exitCode !== 0)
        throw new Error('Antigravity failed. Check the engine installation and authentication. ' + runResult.stderr);
    return { text: runResult.stdout, runResult };
}
export async function runAntigravityCLIJson<T>(prompt: string, options: ModelPromptOptions = {}): Promise<{
    data: T;
    rawText: string;
    runResult: RunResult;
}> {
    const { text, runResult } = await runAntigravityCLI(prompt + '\nReturn only valid JSON.', options);
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    try {
        return { data: JSON.parse(match?.[1] || text), rawText: text, runResult };
    }
    catch {
        throw new Error('Antigravity returned invalid JSON. Retry or choose another engine.');
    }
}
