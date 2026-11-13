import { z } from 'zod';
import { SkillDefinition, SkillExecutionContext } from '../core/types.js';
import { runGeminiCLIJson } from '../../runners/geminiRunner.js';
import { runClaudeCLIJson } from '../../runners/claudeRunner.js';

export const ScriptBeatSchema = z.object({
  beatNumber: z.number(),
  sceneName: z.string(),
  startSec: z.number(),
  durationSec: z.number(),
  spokenVoiceover: z.string(),
  onScreenText: z.string().optional(),
  visualType: z.enum(['talking_head', 'motion_card', 'kinetic_text', 'broll_video', '3d_object']),
  visualDescription: z.string(),
  motionMove: z.enum([
    'rise',
    'pop',
    'count-up',
    'checklist-tick',
    'typewriter',
    'slide-in',
    'blur-in',
    'punch-in',
    'reframe',
    'bar-fill',
    'none',
  ]),
  sfxCue: z.string().optional(),
});
export type ScriptBeat = z.infer<typeof ScriptBeatSchema>;

export const ScriptwriterInputSchema = z.object({
  selectedHook: z.string(),
  targetDurationSec: z.number().default(30),
  topicOrProduct: z.string(),
  keyPoints: z.array(z.string()),
  callToAction: z.string(),
  wordsPerMinute: z.number().default(145), // standard natural speaking rate
});
export type ScriptwriterInput = z.infer<typeof ScriptwriterInputSchema>;

export const ScriptwriterOutputSchema = z.object({
  totalDurationSec: z.number(),
  totalWordCount: z.number(),
  beats: z.array(ScriptBeatSchema),
  fullSpokenScript: z.string(),
  pacingReviewNotes: z.string(),
});
export type ScriptwriterOutput = z.infer<typeof ScriptwriterOutputSchema>;

export const skillBeatScriptwriter: SkillDefinition<ScriptwriterInput, ScriptwriterOutput> = {
  id: 'skill-beat-scriptwriter',
  name: 'Timed Beat Sheet Scriptwriter',
  description: 'Composes conversational, high-retention video scripts broken down into millisecond-timed beats and visual cues.',
  version: '1.0.0',
  inputSchema: ScriptwriterInputSchema,
  outputSchema: ScriptwriterOutputSchema,

  async execute(input: ScriptwriterInput, context: SkillExecutionContext): Promise<ScriptwriterOutput> {
    const prompt = `You are an elite short-form video editor and scriptwriter.
Write a timed, scene-by-scene beat sheet for this video:

HOOK: "${input.selectedHook}"
TARGET DURATION: ${input.targetDurationSec} seconds
TOPIC/PRODUCT: ${input.topicOrProduct}
KEY POINTS:
${input.keyPoints.map((p) => `- ${p}`).join('\n')}
CALL TO ACTION: ${input.callToAction}
SPEAKING RATE: ~${input.wordsPerMinute} words per minute (~2.4 words per second)

PROJECT STYLE GUIDE:
${context.styleGuideMd || 'Clean, fast cuts, tactile micro-sounds, no clutter.'}

RULES:
1. One idea on screen at a time. Never crowd multiple ideas onto one screen.
2. Words must fit the calculated second duration (approx 2.4 words/sec).
3. Assign one of the 10 core motion moves (rise, pop, count-up, checklist-tick, typewriter, slide-in, blur-in, punch-in, reframe, bar-fill) to every graphic moment.
4. Keep graphics out of the bottom 20% and top 10% (Instagram/TikTok safe area).

Return JSON in this format:
{
  "totalDurationSec": 30,
  "totalWordCount": 72,
  "beats": [
    {
      "beatNumber": 1,
      "sceneName": "The Hook",
      "startSec": 0,
      "durationSec": 3,
      "spokenVoiceover": "Most creators lose 80% of viewers right here.",
      "onScreenText": "STOP LOSING VIEWERS.",
      "visualType": "talking_head",
      "visualDescription": "Camera punches in tight on presenter.",
      "motionMove": "punch-in",
      "sfxCue": "subtle_punch"
    }
  ],
  "fullSpokenScript": "...",
  "pacingReviewNotes": "Pacing lands at 2.4 words/second with natural 0.3s breathing pauses between key beats."
}`;

    if (context.modelEngine === 'claude-cli') {
      const { data } = await runClaudeCLIJson<ScriptwriterOutput>(prompt, {
        cwd: context.projectRoot,
        onStdoutChunk: context.onStdoutChunk,
        onThinking: context.onThinking,
      });
      return data;
    } else {
      const { data } = await runGeminiCLIJson<ScriptwriterOutput>(prompt, {
        cwd: context.projectRoot,
        onStdoutChunk: context.onStdoutChunk,
        onThinking: context.onThinking,
      });
      return data;
    }
  },
};
