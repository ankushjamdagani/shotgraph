import { z } from 'zod';
import { SkillDefinition, SkillExecutionContext } from '../core/types.js';
import { runAntigravityCLIJson } from '../../runners/antigravityRunner.js';
import { runClaudeCLIJson } from '../../runners/claudeRunner.js';

export const TasteAnalysisInputSchema = z.object({
  referenceTitle: z.string(),
  referenceUrlOrPath: z.string(),
  transcriptExcerpt: z.string().optional(),
  visualNotes: z.string().optional(),
  preferredArchetype: z
    .enum(['kinetic_type', 'liquid_glass', 'editorial_grain', 'pop_bold', 'auto'])
    .default('auto'),
});
export type TasteAnalysisInput = z.infer<typeof TasteAnalysisInputSchema>;

export const TasteAnalysisOutputSchema = z.object({
  referenceId: z.string(),
  archetype: z.enum(['kinetic_type', 'liquid_glass', 'editorial_grain', 'pop_bold']),
  pacing: z.object({
    avgCutDurationSec: z.number(),
    rhythm: z.enum(['fast_snappy', 'conversational', 'cinematic_unhurried']),
    usefulPauses: z.boolean(),
  }),
  palette: z.object({
    background: z.string(),
    card: z.string(),
    accent: z.string(),
    text: z.string(),
  }),
  typography: z.object({
    displayFont: z.string(),
    bodyFont: z.string(),
    headingCase: z.enum(['uppercase', 'sentence_case', 'mixed']),
  }),
  motion: z.object({
    easingCurve: z.string(), // e.g. "power4.out", "back.out(2.5)", "power3.out"
    overshoot: z.boolean(),
    primaryMoves: z.array(z.string()), // ['rise', 'pop', 'count-up', 'checklist-tick', etc.]
  }),
  audioRules: z.object({
    targetLufs: z.number().default(-14),
    musicDuckingDb: z.number().default(15),
    sfxSignature: z.array(z.string()), // ['subtle_click', 'counter_roll', 'soft_chime']
  }),
  negativeConstraints: z.array(z.string()), // ['no_purple_glow', 'no_unmotivated_whooshes']
  styleDocMarkdown: z.string(),
});
export type TasteAnalysisOutput = z.infer<typeof TasteAnalysisOutputSchema>;

export const skillTasteAnalyzer: SkillDefinition<TasteAnalysisInput, TasteAnalysisOutput> = {
  id: 'skill-taste-analyzer',
  name: 'Taste & Style Guide Analyzer',
  description: 'Deconstructs reference video notes/frames into a coherent STYLE.md and machine-readable style tokens.',
  version: '1.0.0',
  inputSchema: TasteAnalysisInputSchema,
  outputSchema: TasteAnalysisOutputSchema,

  async execute(input: TasteAnalysisInput, context: SkillExecutionContext): Promise<TasteAnalysisOutput> {
    const prompt = `You are a world-class motion graphics director and brand designer.
Analyze this video reference and extract strict, cohesive art direction rules.

REFERENCE: ${input.referenceTitle} (${input.referenceUrlOrPath})
VISUAL OBSERVATIONS: ${input.visualNotes || 'Modern creator video with high retention cuts and animated cards.'}
TRANSCRIPT: ${input.transcriptExcerpt || 'Spoken hook with animated kinetic stats.'}
PREFERRED ARCHETYPE HINT: ${input.preferredArchetype}

Extract the following JSON structure:
{
  "referenceId": "ref_${Date.now()}",
  "archetype": "kinetic_type" | "liquid_glass" | "editorial_grain" | "pop_bold",
  "pacing": {
    "avgCutDurationSec": 1.6,
    "rhythm": "fast_snappy" | "conversational" | "cinematic_unhurried",
    "usefulPauses": true
  },
  "palette": {
    "background": "#0F172A",
    "card": "#1E293B",
    "accent": "#38BDF8",
    "text": "#F8FAFC"
  },
  "typography": {
    "displayFont": "Inter-700",
    "bodyFont": "Inter-400",
    "headingCase": "sentence_case"
  },
  "motion": {
    "easingCurve": "power3.out",
    "overshoot": false,
    "primaryMoves": ["rise", "pop", "count-up", "checklist-tick"]
  },
  "audioRules": {
    "targetLufs": -14,
    "musicDuckingDb": 15,
    "sfxSignature": ["subtle_click", "counter_roll", "chime"]
  },
  "negativeConstraints": [
    "No generic AI purple or neon rainbow button glows",
    "No cartoonish 3D floating without ground contact shadow",
    "No unmotivated whooshes on basic card slides",
    "No text inside Instagram safe margins (top 10%, bottom 20%, right 15%)"
  ],
  "styleDocMarkdown": "# STYLE GUIDE\\n\\n### Aesthetic Rules\\n..."
}`;

    let result: TasteAnalysisOutput;

    if (context.modelEngine === 'claude-cli') {
      const response = await runClaudeCLIJson<TasteAnalysisOutput>(prompt, {
        cwd: context.projectRoot,
        onStdoutChunk: context.onStdoutChunk,
        onThinking: context.onThinking,
      });
      result = response.data;
    } else {
      // Default to Antigravity CLI
      const response = await runAntigravityCLIJson<TasteAnalysisOutput>(prompt, {
        cwd: context.projectRoot,
        onStdoutChunk: context.onStdoutChunk,
        onThinking: context.onThinking,
      });
      result = response.data;
    }

    return result;
  },
};
