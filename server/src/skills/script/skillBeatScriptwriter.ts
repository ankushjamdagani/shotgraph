import { z } from 'zod';
import { SkillDefinition, SkillExecutionContext } from '../core/types.js';
import { runGeminiCLIJson } from '../../runners/geminiRunner.js';
import { runClaudeCLIJson } from '../../runners/claudeRunner.js';

function normalizeVisualType(val: string): 'talking_head' | 'motion_card' | 'kinetic_text' | 'broll_video' | '3d_object' {
  const v = (val || '').toLowerCase().replace(/[\s-]/g, '_');
  if (v.includes('head') || v.includes('talking') || v.includes('speaker') || v.includes('person')) return 'talking_head';
  if (v.includes('text') || v.includes('kinetic') || v.includes('word') || v.includes('type')) return 'kinetic_text';
  if (v.includes('3d') || v.includes('object') || v.includes('render')) return '3d_object';
  if (v.includes('broll') || v.includes('footage') || v.includes('video') || v.includes('cutaway')) return 'broll_video';
  return 'motion_card'; // default
}

function normalizeMotionMove(val: string): 'rise' | 'pop' | 'count-up' | 'checklist-tick' | 'typewriter' | 'slide-in' | 'blur-in' | 'punch-in' | 'reframe' | 'bar-fill' | 'none' {
  const v = (val || '').toLowerCase().replace(/[\s_]/g, '-');
  if (v.includes('pop')) return 'pop';
  if (v.includes('rise') || v.includes('fade')) return 'rise';
  if (v.includes('count')) return 'count-up';
  if (v.includes('check') || v.includes('tick')) return 'checklist-tick';
  if (v.includes('type')) return 'typewriter';
  if (v.includes('slide')) return 'slide-in';
  if (v.includes('blur')) return 'blur-in';
  if (v.includes('punch') || v.includes('zoom')) return 'punch-in';
  if (v.includes('reframe')) return 'reframe';
  if (v.includes('bar') || v.includes('progress') || v.includes('fill')) return 'bar-fill';
  return 'pop'; // default
}

export const ScriptBeatSchema = z.object({
  beatNumber: z.coerce.number().default(1),
  sceneName: z.string().default('Scene'),
  startSec: z.coerce.number().default(0),
  durationSec: z.coerce.number().default(3),
  spokenVoiceover: z.string(),
  onScreenText: z.string().optional(),
  visualType: z.string().transform(normalizeVisualType),
  visualDescription: z.string().default(''),
  motionMove: z.string().transform(normalizeMotionMove),
  sfxCue: z.string().optional(),
});
export type ScriptBeat = z.infer<typeof ScriptBeatSchema>;

export const ScriptwriterInputSchema = z.object({
  selectedHook: z.string(),
  targetDurationSec: z.coerce.number().default(30),
  topicOrProduct: z.string(),
  keyPoints: z.array(z.string()).default([]),
  callToAction: z.string().default('Follow for more'),
  wordsPerMinute: z.coerce.number().default(145),
});
export type ScriptwriterInput = z.infer<typeof ScriptwriterInputSchema>;

export const ScriptwriterOutputSchema = z.object({
  totalDurationSec: z.coerce.number().default(30),
  totalWordCount: z.coerce.number().default(70),
  beats: z.array(ScriptBeatSchema),
  fullSpokenScript: z.string().optional(),
  pacingReviewNotes: z.string().default(''),
}).transform((data) => ({
  ...data,
  fullSpokenScript: data.fullSpokenScript || data.beats.map((b) => b.spokenVoiceover).join(' '),
}));
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
1. One idea on screen at a time.
2. Words must fit the calculated second duration (approx 2.4 words/sec).
3. Allowed motion moves: rise, pop, count-up, checklist-tick, typewriter, slide-in, blur-in, punch-in, reframe, bar-fill.
4. Allowed visual types: talking_head, motion_card, kinetic_text, broll_video, 3d_object.

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
  "pacingReviewNotes": "Pacing calibrated at 2.4 words per second."
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
