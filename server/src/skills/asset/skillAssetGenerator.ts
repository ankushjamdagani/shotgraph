import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs/promises';
import { SkillDefinition, SkillExecutionContext } from '../core/types.js';

export const AssetGeneratorInputSchema = z.object({
  subjectName: z.string(),
  category: z.enum(['character', 'product', 'environment', 'prop']).default('character'),
  coreDescription: z.string(),
  variantLabel: z.string().optional().default('Turnaround Portrait'),
  turnaroundAngle: z
    .enum(['portrait', 'three_quarter', 'full_body', 'macro_detail'])
    .optional()
    .default('portrait'),
  masterStyleAnchorAssetUrl: z.string().optional(),
  targetPlatform: z.enum(['midjourney', 'flux', 'comfyui', 'generic']).optional().default('midjourney'),
  subjectId: z.string().optional(),
  variantId: z.string().optional(),
});
export type AssetGeneratorInput = z.infer<typeof AssetGeneratorInputSchema>;

export const AssetGeneratorOutputSchema = z.object({
  synthesizedPrompt: z.string(),
  fullString: z.string(),
  negativeGuards: z.string(),
  styleTokensInjected: z.array(z.string()),
  masterStyleAnchorUrl: z.string().optional(),
  suggestedAssetPath: z.string(),
  instructions: z.string(),
});
export type AssetGeneratorOutput = z.infer<typeof AssetGeneratorOutputSchema>;

export const skillAssetGenerator: SkillDefinition<AssetGeneratorInput, AssetGeneratorOutput> = {
  id: 'skill-asset-generator',
  name: 'Subject Asset & Style Parity Generator',
  description:
    'Generates visual character and product turnaround prompts locked with the project Master Style Anchor (--sref), STYLE.md DNA, and Two-Layer Negative Guards.',
  version: '1.0.0',
  inputSchema: AssetGeneratorInputSchema,
  outputSchema: AssetGeneratorOutputSchema,

  async execute(input: AssetGeneratorInput, context: SkillExecutionContext): Promise<AssetGeneratorOutput> {
    const tokens: Record<string, any> = context.styleTokensJson || {};
    const palette = tokens.palette || { background: '#0F172A', accent: '#38BDF8', text: '#F8FAFC' };
    const archetype = tokens.archetype || 'liquid_glass';
    const negativeConstraints: string[] = tokens.negativeConstraints || [];

    // 1. Angle & Composition Framing
    const angleMap: Record<string, { desc: string; lens: string; aperture: string }> = {
      portrait: {
        desc: 'front studio portrait, direct eye-contact framing, neutral professional expression',
        lens: '50mm prime portrait lens',
        aperture: 'f/1.8 shallow depth of field with creamy bokeh',
      },
      three_quarter: {
        desc: '3/4 profile turnaround angle showing jawline, posture, and side profile structure',
        lens: '35mm cinema lens',
        aperture: 'f/2.8 crisp edge definition',
      },
      full_body: {
        desc: 'full-length environmental character stance, showing complete wardrobe and shoes',
        lens: '35mm wide-normal lens',
        aperture: 'f/4 deep environmental focus',
      },
      macro_detail: {
        desc: 'extreme macro texture detail shot highlighting skin texture, eyes, fabric fibers, or product surface finish',
        lens: '85mm macro lens',
        aperture: 'f/2.8 compressed micro focus',
      },
    };
    const angleDetails = angleMap[input.turnaroundAngle || 'portrait'] || angleMap.portrait;

    // 2. Archetype Style DNA
    let lighting = 'soft diffused studio key light, subtle neutral rim light, neutral fill ratio';
    let textureStyle = 'cinematic realism, tangible tactile skin texture, neutral color grade';
    let layer1Negatives = [
      'oversaturated neon glows',
      'plastic airbrushed skin',
      'cartoonish 3D render look',
      'generic stock photo feel',
      ...negativeConstraints,
    ];

    if (archetype === 'editorial_grain') {
      lighting = 'warm natural window morning light, organic soft shadows';
      textureStyle = 'editorial print magazine photography, Kodak Portra 400 16mm grain texture, muted organic contrast';
      layer1Negatives = [
        'glossy modern 3d',
        'harsh digital neon',
        'unnatural specular shine',
        'modern UI overlays',
        ...negativeConstraints,
      ];
    } else if (archetype === 'kinetic_type') {
      lighting = 'high-contrast studio rim lighting, deep solid black shadows, razor-sharp edge contrast';
      textureStyle = 'bold graphic studio silhouette, crisp stark composition, Swiss design aesthetic';
      layer1Negatives = ['muddy gradients', 'sepia tone', 'soft unfocused edges', ...negativeConstraints];
    } else if (archetype === 'pop_bold') {
      lighting = 'flat vibrant pop-art studio lighting, hard graphic shadows, zero gradients';
      textureStyle = 'neo-brutalist pop aesthetic, chunky clean borders, saturated solid blocks';
      layer1Negatives = ['dull muted tones', 'gloomy shadows', 'gritty realism', ...negativeConstraints];
    }

    // 3. Two-Layer Negative Guards
    const layer2ArtifactNegatives = [
      'distorted hands',
      'extra fingers',
      'missing limbs',
      'deformed anatomy',
      'warped eyes',
      'asymmetrical facial structure',
      'watermarks',
      'text overlay',
      'low resolution compression artifacts',
    ];
    const negativeGuards = Array.from(new Set([...layer1Negatives, ...layer2ArtifactNegatives])).join(', ');

    // 4. Master Style Anchor Integration (--sref for Midjourney / IP-Adapter reference)
    let srefFlag = '';
    let styleAnchorNote = '';
    if (input.masterStyleAnchorAssetUrl) {
      srefFlag = ` --sref ${input.masterStyleAnchorAssetUrl} --sw 100`;
      styleAnchorNote = `Locked to Master Style Anchor (${input.masterStyleAnchorAssetUrl}) to guarantee 100% aesthetic harmony with prior approved assets.`;
    }

    // 5. Build Synthesized Prompt
    const subjectPrefix = input.category === 'product' ? 'Hero product turnaround' : 'Character turnaround portrait';
    const coreIdentity = `${subjectPrefix} of ${input.subjectName}: ${input.coreDescription}`;
    const variantSpec = input.variantLabel ? ` (${input.variantLabel})` : '';

    const synthesizedPrompt = `${coreIdentity}${variantSpec}, ${angleDetails.desc}, ${angleDetails.lens} at ${angleDetails.aperture}, ${lighting}, color tones influenced by ${palette.background} and ${palette.accent}, ${textureStyle}`;

    const fullString = `${synthesizedPrompt} --ar 1:1 --style raw --v 6.1 --no ${negativeGuards}${srefFlag}`;

    // Target storage path
    const safeSubjectId = input.subjectId || input.subjectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const safeVariantId = input.variantId || 'var_01';
    const suggestedAssetPath = `assets/subjects/${safeSubjectId}/${safeVariantId}.png`;

    return {
      synthesizedPrompt,
      fullString,
      negativeGuards,
      styleTokensInjected: [
        `Archetype: ${archetype}`,
        `Palette: ${palette.background} / ${palette.accent}`,
        `Framing: ${angleDetails.desc}`,
        `Optics: ${angleDetails.lens} at ${angleDetails.aperture}`,
        ...(input.masterStyleAnchorAssetUrl ? [`Master Style Anchor: ${input.masterStyleAnchorAssetUrl}`] : []),
      ],
      masterStyleAnchorUrl: input.masterStyleAnchorAssetUrl,
      suggestedAssetPath,
      instructions: styleAnchorNote || 'First subject asset in project. Upon approval, mark as Master Style Anchor.',
    };
  },
};
