import { runAntigravityCLIJson } from '../runners/antigravityRunner.js';
import { runClaudeCLIJson } from '../runners/claudeRunner.js';
import { runOllama } from '../runners/ollamaRunner.js';
export type SetupEngine = 'antigravity-cli' | 'claude-cli' | 'ollama' | 'chatgpt';
/** A real, minimal structured-response round trip through the selected runner. */
export async function testModelConnection(engine: SetupEngine, signal?: AbortSignal) {
  const prompt = 'Connection test only. Do not use tools or access files. Return exactly this JSON: {"ready":true}';
  const options={timeoutMs:20000,signal};
  const started=Date.now();
  let result: {ready?: boolean} | null = null;
  if (engine === 'claude-cli') {
    result = (await runClaudeCLIJson<{ready:boolean}>(prompt,options)).data;
  } else if (engine === 'antigravity-cli') {
    result = (await runAntigravityCLIJson<{ready:boolean}>(prompt,options)).data;
  } else if (engine === 'ollama') {
    result = JSON.parse((await runOllama(prompt,options)).text.replace(/```(?:json)?|```/g,'').trim());
  } else if (engine === 'chatgpt') {
    // OpenAI / ChatGPT engine test
    throw new Error('ChatGPT is not configured. Choose a supported creative engine.');
  }
  if (signal?.aborted) throw new Error('Connection test canceled.');
  if (result?.ready !== true) throw new Error('The engine responded, but did not return the expected structured response.');
  return {engine,durationMs:Date.now()-started};
}
