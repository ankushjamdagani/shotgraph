import { describe,it,expect,vi,beforeEach } from 'vitest';
import { testModelConnection } from '../../src/services/modelConnection.js';
import { runAntigravityCLIJson } from '../../src/runners/antigravityRunner.js';
import { runClaudeCLIJson } from '../../src/runners/claudeRunner.js';
import { runOllama } from '../../src/runners/ollamaRunner.js';
vi.mock('../../src/runners/antigravityRunner.js',()=>({runAntigravityCLIJson:vi.fn()}));
vi.mock('../../src/runners/claudeRunner.js',()=>({runClaudeCLIJson:vi.fn()}));
vi.mock('../../src/runners/ollamaRunner.js',()=>({runOllama:vi.fn()}));
describe('model connection verification',()=>{
 beforeEach(()=>vi.resetAllMocks());
 it('tests the selected runner, without falling back to another engine',async()=>{
  vi.mocked(runClaudeCLIJson).mockResolvedValue({data:{ready:true}} as any);
  expect((await testModelConnection('claude-cli')).engine).toBe('claude-cli');
  expect(runAntigravityCLIJson).not.toHaveBeenCalled(); expect(runOllama).not.toHaveBeenCalled();
 });
 it('rejects a failed runner rather than reporting readiness',async()=>{
  vi.mocked(runAntigravityCLIJson).mockRejectedValue(new Error('Not signed in'));
  await expect(testModelConnection('antigravity-cli')).rejects.toThrow('Not signed in');
 });
 it('rejects a response without explicit readiness',async()=>{
  vi.mocked(runAntigravityCLIJson).mockResolvedValue({data:{ready:false}} as any);
  await expect(testModelConnection('antigravity-cli')).rejects.toThrow('expected structured response');
 });
 it('accepts valid fenced JSON from Ollama',async()=>{
  vi.mocked(runOllama).mockResolvedValue({text:'```json\n{"ready":true}\n```'} as any);
  expect((await testModelConnection('ollama')).engine).toBe('ollama');
 });
 it('does not accept a result after cancellation',async()=>{
  vi.mocked(runClaudeCLIJson).mockResolvedValue({data:{ready:true}} as any);
  const controller=new AbortController(); controller.abort();
  await expect(testModelConnection('claude-cli',controller.signal)).rejects.toThrow('canceled');
 });
});
