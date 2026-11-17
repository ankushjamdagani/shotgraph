import { runAntigravityCLIJson, ModelPromptOptions } from './antigravityRunner.js';
import { runClaudeCLIJson } from './claudeRunner.js';
import { runOllama } from './ollamaRunner.js';
export async function runModelJson<T>(prompt: string, engine: string | undefined, options: ModelPromptOptions = {}): Promise<T> {
  if (engine === 'claude-cli') return (await runClaudeCLIJson<T>(prompt, options)).data;
  if (engine === 'ollama') {
    const {text} = await runOllama(prompt + '\nReturn only valid JSON.', options);
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    try { return JSON.parse(fenced?.[1] || text); } catch { throw new Error('Ollama returned invalid JSON. Retry or choose another engine.'); }
  }
  if (engine === 'antigravity-cli' || !engine) {
    return (await runAntigravityCLIJson<T>(prompt, options)).data;
  }
  throw new Error('Select a language model engine to generate text.');
}
