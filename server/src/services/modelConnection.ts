import { runAntigravityCLIJson } from '../runners/antigravityRunner.js';
import { runClaudeCLIJson } from '../runners/claudeRunner.js';
import { runOllama } from '../runners/ollamaRunner.js';
export type SetupEngine = 'antigravity-cli' | 'claude-cli' | 'ollama';
/** A real, minimal structured-response round trip through the selected runner. */
export async function testModelConnection(engine: SetupEngine, signal?: AbortSignal) {
  const prompt = 'Connection test only. Do not use tools or access files. Return exactly this JSON: {"ready":true}';
  const options={timeoutMs:20000,signal};
  const started=Date.now();
  const result=engine==='claude-cli' ? (await runClaudeCLIJson<{ready:boolean}>(prompt,options)).data
    : engine==='antigravity-cli' ? (await runAntigravityCLIJson<{ready:boolean}>(prompt,options)).data
    : JSON.parse((await runOllama(prompt,options)).text.replace(/```(?:json)?|```/g,'').trim());
  if (signal?.aborted) throw new Error('Connection test canceled.');
  if (result?.ready !== true) throw new Error('The engine responded, but did not return the expected structured response.');
  return {engine,durationMs:Date.now()-started};
}
