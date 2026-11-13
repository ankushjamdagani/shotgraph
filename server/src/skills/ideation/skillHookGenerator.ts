import { z } from 'zod';
import { SkillDefinition, SkillExecutionContext } from '../core/types.js';
import { runGeminiCLIJson } from '../../runners/geminiRunner.js';
import { runClaudeCLIJson } from '../../runners/claudeRunner.js';

export const HookGeneratorInputSchema = z.object({
  topicOrProduct: z.string(),
  coreValueProp: z.string(),
  targetAudience: z.string(),
  tone: z.enum(['punchy_bold', 'humorous', 'curiosity_gap', 'contrarian', 'educational']).default('punchy_bold'),
  aspectRatio: z.enum(['9:16', '16:9', '1:1']).default('9:16'),
});
export type HookGeneratorInput = z.infer<typeof HookGeneratorInputSchema>;

export const HookCandidateSchema = z.object({
  id: z.string(),
  spokenWords: z.string(), // Hook voiceover line (under 12 words)
  visualAction: z.string(), // What the camera/background does in first 2 seconds
  onScreenText: z.string(), // Big bold kinetic text (3-5 words max)
  sfxCue: z.string(), // e.g. "punch_in_sound", "counter_click"
  retentionAngle: z.string(), // Why this stops the scroll
});
export type HookCandidate = z.infer<typeof HookCandidateSchema>;

export const HookGeneratorOutputSchema = z.object({
  candidates: z.array(HookCandidateSchema),
  recommendationReason: z.string(),
});
export type HookGeneratorOutput = z.infer<typeof HookGeneratorOutputSchema>;

export const skillHookGenerator: SkillDefinition<HookGeneratorInput, HookGeneratorOutput> = {
  id: 'skill-hook-generator',
  name: '3-Second Scroll-Stopping Hook Generator',
  description: 'Generates high-retention 3-second video hooks with pattern-interrupt spoken lines, kinetic text, and camera action.',
  version: '1.0.0',
  inputSchema: HookGeneratorInputSchema,
  outputSchema: HookGeneratorOutputSchema,

  async execute(input: HookGeneratorInput, context: SkillExecutionContext): Promise<HookGeneratorOutput> {
    const prompt = `You are a viral short-form video retention specialist and script doctor.
Generate 3 distinct, high-impact 3-second hook candidates for:

TOPIC/PRODUCT: ${input.topicOrProduct}
CORE VALUE: ${input.coreValueProp}
TARGET AUDIENCE: ${input.targetAudience}
TONE: ${input.tone}
ASPECT RATIO: ${input.aspectRatio}

STYLE RULES TO RESPECT:
${context.styleGuideMd || 'Clean, high-contrast, modern creator aesthetic.'}

CRITICAL RULES:
1. Spoken words MUST be under 12 words (spoken in under 2.5 seconds).
2. On-screen text MUST be 3-5 words max, huge display font, no full sentences.
3. Keep visuals out of the bottom 20% and top 10% (Instagram/TikTok safe areas).
4. No boring greetings ("Hey guys"). Immediate pattern interrupt.

Return JSON in this format:
{
  "candidates": [
    {
      "id": "hook_1",
      "spokenWords": "Most creators lose 80% of viewers right here.",
      "visualAction": "Rapid punch-in on speaker, background blurs.",
      "onScreenText": "STOP LOSING VIEWERS.",
      "sfxCue": "punch_in_subtle",
      "retentionAngle": "Pattern interrupt challenging creator anxiety."
    }
  ],
  "recommendationReason": "Hook 1 creates the sharpest curiosity gap."
}`;

    if (context.modelEngine === 'claude-cli') {
      const { data } = await runClaudeCLIJson<HookGeneratorOutput>(prompt, {
        cwd: context.projectRoot,
        onStdoutChunk: context.onStdoutChunk,
        onThinking: context.onThinking,
      });
      return data;
    } else {
      const { data } = await runGeminiCLIJson<HookGeneratorOutput>(prompt, {
        cwd: context.projectRoot,
        onStdoutChunk: context.onStdoutChunk,
        onThinking: context.onThinking,
      });
      return data;
    }
  },
};
