import { z } from 'zod';
import { SkillDefinition, SkillExecutionContext } from '../core/types.js';
import { TasteAnalysisOutput, TasteAnalysisOutputSchema } from './skillTasteAnalyzer.js';

export const TasteMixerInputSchema = z.object({
  references: z.array(TasteAnalysisOutputSchema),
  attributeMap: z.object({
    pacingFromRefId: z.string(),
    paletteFromRefId: z.string(),
    typographyFromRefId: z.string(),
    motionFromRefId: z.string(),
    audioFromRefId: z.string(),
  }),
  customNegativeConstraints: z.array(z.string()).default([]),
});
export type TasteMixerInput = z.infer<typeof TasteMixerInputSchema>;

export const CompositeStyleGuideSchema = z.object({
  id: z.string(),
  title: z.string(),
  archetype: z.enum(['kinetic_type', 'liquid_glass', 'editorial_grain', 'pop_bold']),
  pacing: TasteAnalysisOutputSchema.shape.pacing,
  palette: TasteAnalysisOutputSchema.shape.palette,
  typography: TasteAnalysisOutputSchema.shape.typography,
  motion: TasteAnalysisOutputSchema.shape.motion,
  audioRules: TasteAnalysisOutputSchema.shape.audioRules,
  negativeConstraints: z.array(z.string()),
  styleMarkdown: z.string(),
});
export type CompositeStyleGuide = z.infer<typeof CompositeStyleGuideSchema>;

export const skillTasteMixer: SkillDefinition<TasteMixerInput, CompositeStyleGuide> = {
  id: 'skill-taste-mixer',
  name: 'Interactive Taste Mixer',
  description: 'Combines divergent style attributes across multiple references into a single cohesive project STYLE.md.',
  version: '1.0.0',
  inputSchema: TasteMixerInputSchema,
  outputSchema: CompositeStyleGuideSchema,

  async execute(input: TasteMixerInput, context: SkillExecutionContext): Promise<CompositeStyleGuide> {
    const refMap = new Map<string, TasteAnalysisOutput>();
    for (const ref of input.references) {
      refMap.set(ref.referenceId, ref);
    }

    const pacingRef = refMap.get(input.attributeMap.pacingFromRefId) || input.references[0];
    const paletteRef = refMap.get(input.attributeMap.paletteFromRefId) || input.references[0];
    const typeRef = refMap.get(input.attributeMap.typographyFromRefId) || input.references[0];
    const motionRef = refMap.get(input.attributeMap.motionFromRefId) || input.references[0];
    const audioRef = refMap.get(input.attributeMap.audioFromRefId) || input.references[0];

    const mergedNegatives = Array.from(
      new Set([
        ...paletteRef.negativeConstraints,
        ...motionRef.negativeConstraints,
        ...input.customNegativeConstraints,
      ])
    );

    const styleMarkdown = `# PROJECT STYLE GUIDE (STYLE.md)

### Archetype & Vibe
- **Dominant Style**: ${motionRef.archetype.toUpperCase().replace('_', ' ')}
- **Cut Rhythm**: ${pacingRef.pacing.rhythm} (Average cut: ${pacingRef.pacing.avgCutDurationSec}s)

### Color Palette
- Background: \`${paletteRef.palette.background}\`
- Card Container: \`${paletteRef.palette.card}\`
- Accent: \`${paletteRef.palette.accent}\`
- Text: \`${paletteRef.palette.text}\`

### Typography
- Display / Headings: \`${typeRef.typography.displayFont}\` (${typeRef.typography.headingCase})
- Body Copy: \`${typeRef.typography.bodyFont}\`

### Motion Engineering
- Easing Curve: \`${motionRef.motion.easingCurve}\`
- Overshoot: ${motionRef.motion.overshoot ? 'Enabled (tactile bounce)' : 'Disabled (calm/smooth)'}
- Key Moves: ${motionRef.motion.primaryMoves.join(', ')}

### Audio & Sound Design
- Master Target: ${audioRef.audioRules.targetLufs} LUFS
- Music Ducking Depth: -${audioRef.audioRules.musicDuckingDb} dB under speech
- SFX Palette: ${audioRef.audioRules.sfxSignature.join(', ')}

### Banned Aesthetics (Negative Constraints)
${mergedNegatives.map((neg) => `- ${neg}`).join('\n')}
`;

    return {
      id: `style_composite_${Date.now()}`,
      title: 'Composite Project Style',
      archetype: motionRef.archetype,
      pacing: pacingRef.pacing,
      palette: paletteRef.palette,
      typography: typeRef.typography,
      motion: motionRef.motion,
      audioRules: audioRef.audioRules,
      negativeConstraints: mergedNegatives,
      styleMarkdown,
    };
  },
};
