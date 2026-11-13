import { z } from 'zod';
import { SkillDefinition, SkillExecutionContext } from '../core/types.js';

export const PromptSynthesizerInputSchema = z.object({
  targetPlatform: z.enum(['midjourney', 'flux', 'kling', 'runway', 'elevenlabs', 'generic']),
  shotConcept: z.string(), // What the shot needs to depict
  aspectRatio: z.enum(['9:16', '16:9', '1:1']).default('9:16'),
  durationSec: z.number().default(4), // for video models
  shotType: z.enum(['close_up', 'medium_shot', 'wide_establishing', 'macro_detail', 'ui_isometric']).default('medium_shot'),
});
export type PromptSynthesizerInput = z.infer<typeof PromptSynthesizerInputSchema>;

export const PromptSynthesizerOutputSchema = z.object({
  targetPlatform: z.string(),
  finalPrompt: z.string(),
  negativePrompt: z.string(),
  aspectRatioFlag: z.string(),
  injectedStyleTokens: z.array(z.string()),
  copyableFullString: z.string(),
  guidanceNotes: z.string(),
});
export type PromptSynthesizerOutput = z.infer<typeof PromptSynthesizerOutputSchema>;

export const skillPromptSynthesizer: SkillDefinition<PromptSynthesizerInput, PromptSynthesizerOutput> = {
  id: 'skill-prompt-synthesizer',
  name: 'External Prompt Synthesizer & Style Locker',
  description: 'Formats prompts for Midjourney, Flux, Kling, Runway, and ElevenLabs locked with the project exact lighting, lens, and color palette tokens.',
  version: '1.0.0',
  inputSchema: PromptSynthesizerInputSchema,
  outputSchema: PromptSynthesizerOutputSchema,

  async execute(input: PromptSynthesizerInput, context: SkillExecutionContext): Promise<PromptSynthesizerOutput> {
    const tokens: Record<string, any> = context.styleTokensJson || {};
    const palette = tokens.palette || { background: '#0F172A', accent: '#38BDF8', text: '#F8FAFC' };
    const archetype = tokens.archetype || 'liquid_glass';

    let lensAndLighting = 'shot on 35mm lens, f/1.8 aperture, soft diffused key lighting, subtle rim light';
    let styleKeywords = 'cinematic realism, tactile texture, premium studio quality';
    let negativeTerms = 'oversaturated, cartoonish, 3d blender render look, generic purple glow, distorted hands';

    if (archetype === 'editorial_grain') {
      lensAndLighting = '35mm film stock, warm natural morning light, organic 16mm grain texture';
      styleKeywords = 'editorial print magazine aesthetic, muted contrast, subtle paper texture';
      negativeTerms = 'glossy, digital 3d, neon, plastic, modern UI overlays';
    } else if (archetype === 'kinetic_type') {
      lensAndLighting = 'high-contrast studio lighting, deep solid black shadows, clean rim highlights';
      styleKeywords = 'bold graphic silhouette, stark minimalism, Swiss style composition';
    } else if (archetype === 'pop_bold') {
      lensAndLighting = 'flat vibrant pop-art lighting, zero gradients, hard graphic shadows';
      styleKeywords = 'neo-brutalist pop illustration, chunky ink borders, bold flat blocks';
    }

    let finalPrompt = '';
    let negativePrompt = negativeTerms;
    let aspectRatioFlag = input.aspectRatio === '9:16' ? '--ar 9:16' : input.aspectRatio === '16:9' ? '--ar 16:9' : '--ar 1:1';
    let copyableFullString = '';
    let guidanceNotes = '';

    if (input.targetPlatform === 'midjourney') {
      finalPrompt = `${input.shotConcept}, ${input.shotType}, ${lensAndLighting}, color palette inspired by ${palette.background} and ${palette.accent}, ${styleKeywords} ${aspectRatioFlag} --style raw --v 6.1`;
      negativePrompt = `--no ${negativeTerms}`;
      copyableFullString = `${finalPrompt} ${negativePrompt}`;
      guidanceNotes = 'Paste directly into Midjourney Discord or web alpha. Download image and drag into node dropzone.';
    } else if (input.targetPlatform === 'flux') {
      finalPrompt = `${input.shotConcept}, ${input.shotType}, ${lensAndLighting}, colors centered around ${palette.accent}, ${styleKeywords}, photorealistic 8k detail`;
      copyableFullString = finalPrompt;
      guidanceNotes = 'Paste into Flux web generator or local ComfyUI Flux workflow.';
    } else if (input.targetPlatform === 'runway' || input.targetPlatform === 'kling') {
      finalPrompt = `Cinematic video: ${input.shotConcept}, ${input.shotType}, camera moves smoothly forward with gentle parallax, ${lensAndLighting}, high frame rate fluid motion, professional color grade, 4k`;
      copyableFullString = finalPrompt;
      guidanceNotes = `Run with ${input.durationSec}s duration and ${input.aspectRatio} aspect ratio. Use visual trimmer modal if generated video length exceeds shot duration.`;
    } else if (input.targetPlatform === 'elevenlabs') {
      finalPrompt = `Voice direction: Conversational, energetic yet authoritative creator voice, crisp microphone presence, close-mic proximity effect, zero echo, natural micro-pauses.`;
      copyableFullString = input.shotConcept; // for voice, shotConcept contains the spoken script
      guidanceNotes = 'Paste the script text into ElevenLabs Speech Synthesis with Voice Design settings above.';
    } else {
      finalPrompt = `${input.shotConcept}, ${lensAndLighting}, ${styleKeywords}`;
      copyableFullString = finalPrompt;
      guidanceNotes = 'Generic prompt with locked style tokens.';
    }

    return {
      targetPlatform: input.targetPlatform,
      finalPrompt,
      negativePrompt,
      aspectRatioFlag,
      injectedStyleTokens: [
        `Palette: ${palette.background} / ${palette.accent}`,
        `Archetype: ${archetype}`,
        `Lighting: ${lensAndLighting}`,
      ],
      copyableFullString,
      guidanceNotes,
    };
  },
};
