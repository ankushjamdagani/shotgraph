import { z } from 'zod';
import { RunOptions } from '../../runners/base.js';

export type ModelEngine = 'gemini-cli' | 'claude-cli' | 'ollama' | 'hyperframes' | 'ffmpeg' | 'external';

export interface SkillExecutionContext extends RunOptions {
  modelEngine?: ModelEngine;
  modelName?: string;
  projectRoot: string;
  styleGuideMd?: string;
  styleTokensJson?: Record<string, any>;
  onLog?: (message: string) => void;
  onThinking?: (thought: string) => void;
}

export interface SkillDefinition<TInput = any, TOutput = any> {
  id: string;
  name: string;
  description: string;
  version: string;
  inputSchema: z.ZodType<TInput, any, any>;
  outputSchema: z.ZodType<TOutput, any, any>;
  execute: (input: TInput, context: SkillExecutionContext) => Promise<TOutput>;
}
