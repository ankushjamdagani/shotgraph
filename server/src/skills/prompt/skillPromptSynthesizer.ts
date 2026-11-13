import { z } from 'zod';
import { SkillDefinition, SkillExecutionContext } from '../core/types.js';

export const PromptSynthesizerInputSchema = z.object({
  targetPlatform: z
    .enum(['midjourney', 'flux', 'kling', 'runway', 'luma', 'minimax', 'comfyui', 'elevenlabs', 'generic'])
    .optional()
    .default('runway'),
  shotConcept: z.string(), // What the shot needs to depict
  aspectRatio: z.enum(['9:16', '16:9', '1:1']).optional().default('9:16'),
  durationSec: z.number().optional().default(4), // derived from scene.targetDurationSec
  fps: z.number().optional().default(30),
  shotType: z
    .enum(['close_up', 'medium_shot', 'wide_establishing', 'macro_detail', 'ui_isometric'])
    .optional()
    .default('medium_shot'),
  lensFocalLength: z.string().optional().default('35mm'), // 24mm, 35mm, 50mm, 85mm
  aperture: z.string().optional().default('f/1.8'),
  cameraMovement: z.string().optional().default('slow_dolly_in'), // slow_dolly_in, smooth_tracking_pan, crane_up, orbit, static_lock
  motionSpeed: z
    .enum(['slow_cinematic', 'normal', 'high_energy', 'time_lapse'])
    .optional()
    .default('slow_cinematic'),
  spokenVoiceover: z.string().optional(),
  continuityContext: z.string().optional(), // Incoming/outgoing transition notes
  subjectAnchors: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        coreDescription: z.string(),
        variantLabel: z.string().optional(),
        variantDescription: z.string().optional(),
        mediaUrl: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});
export type PromptSynthesizerInput = z.input<typeof PromptSynthesizerInputSchema>;

export const PlatformPromptDetailSchema = z.object({
  platform: z.string(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  fullString: z.string(),
  notes: z.string(),
  referenceImageUrls: z.array(z.string()).optional(),
  parameters: z.record(z.any()).optional(),
});
export type PlatformPromptDetail = z.infer<typeof PlatformPromptDetailSchema>;

export const PromptSynthesizerOutputSchema = z.object({
  targetPlatform: z.string(),
  finalPrompt: z.string(),
  negativePrompt: z.string(),
  aspectRatioFlag: z.string(),
  injectedStyleTokens: z.array(z.string()),
  copyableFullString: z.string(),
  guidanceNotes: z.string(),
  technicalParameters: z.record(z.any()),
  referenceImageUrls: z.array(z.string()),
  allPlatformPrompts: z.record(PlatformPromptDetailSchema),
});
export type PromptSynthesizerOutput = z.infer<typeof PromptSynthesizerOutputSchema>;

export const skillPromptSynthesizer: SkillDefinition<PromptSynthesizerInput, PromptSynthesizerOutput> = {
  id: 'skill-prompt-synthesizer',
  name: 'External Prompt Synthesizer & Style Locker',
  description:
    'Synthesizes rich, context-aware prompts for Runway Gen-3, Kling 1.5/Pro, Luma Dream Machine, Minimax, ComfyUI, Flux, Midjourney, and ElevenLabs locked with two-layer negative guards and project subject anchors.',
  version: '2.0.0',
  inputSchema: PromptSynthesizerInputSchema,
  outputSchema: PromptSynthesizerOutputSchema,

  async execute(rawInput: PromptSynthesizerInput, context: SkillExecutionContext): Promise<PromptSynthesizerOutput> {
    const input = PromptSynthesizerInputSchema.parse(rawInput);
    const tokens: Record<string, any> = context.styleTokensJson || {};
    const palette = tokens.palette || { background: '#0F172A', accent: '#38BDF8', text: '#F8FAFC' };
    const archetype = tokens.archetype || 'liquid_glass';
    const negativeConstraints: string[] = tokens.negativeConstraints || [];

    // 1. Camera & Optics Configuration
    const lens = input.lensFocalLength || '35mm';
    const aperture = input.aperture || 'f/1.8';
    const move = input.cameraMovement || 'slow_dolly_in';
    const duration = input.durationSec || 4;
    const fps = input.fps || 30;

    // Readable camera movement descriptor
    const cameraMoveMap: Record<string, { label: string; runwayTag: string; klingTag: string; narrative: string }> = {
      slow_dolly_in: {
        label: 'Slow Dolly In',
        runwayTag: 'camera: push in slowly',
        klingTag: 'Camera Movement: Zoom In (Gentle)',
        narrative: 'The camera pushes forward slowly on the z-axis with subtle parallax',
      },
      smooth_tracking_pan: {
        label: 'Smooth Tracking Pan',
        runwayTag: 'camera: pan right smoothly',
        klingTag: 'Camera Movement: Horizontal Right',
        narrative: 'The camera tracks smoothly laterally alongside the subject',
      },
      crane_up: {
        label: 'Crane / Pedestal Up',
        runwayTag: 'camera: pedestal up',
        klingTag: 'Camera Movement: Vertical Up',
        narrative: 'The camera elevates gracefully on a pedestal crane revealing the scale',
      },
      orbit: {
        label: 'Orbit Around Subject',
        runwayTag: 'camera: arc orbit around subject',
        klingTag: 'Camera Movement: Clockwise Arc',
        narrative: 'The camera arcs smoothly around the subject in an orbital trajectory',
      },
      static_lock: {
        label: 'Static Tripod Lock',
        runwayTag: 'camera: static lock, zero shake',
        klingTag: 'Camera Movement: Static Fixed',
        narrative: 'The camera is locked rigidly on a studio tripod with zero camera shake',
      },
    };
    const moveDetails = cameraMoveMap[move] || cameraMoveMap.slow_dolly_in;

    // Readable shot type descriptor
    const shotTypeMap: Record<string, string> = {
      close_up: 'tight close-up shot',
      medium_shot: 'cinematic medium shot',
      wide_establishing: 'wide establishing environmental shot',
      macro_detail: 'extreme macro detail shot',
      ui_isometric: 'isometric perspective shot with clean depth',
    };
    const shotTypeLabel = shotTypeMap[input.shotType] || 'cinematic shot';

    // 2. Archetype Lighting & Texture Tokens
    let lightingAndLens = `shot on ${lens} prime lens at ${aperture}, soft diffused key lighting, subtle rim light`;
    let styleKeywords = 'cinematic realism, tactile texture, premium studio quality, neutral color grading';
    let layer1AestheticNegatives = [
      'oversaturated neon glows',
      'cartoonish 3D render look',
      'cheap digital airbrushing',
      'generic stock video feel',
      ...negativeConstraints,
    ];

    if (archetype === 'editorial_grain') {
      lightingAndLens = `${lens} anamorphic film stock at ${aperture}, warm natural morning light, organic 16mm grain texture`;
      styleKeywords = 'editorial print magazine aesthetic, muted natural contrast, subtle paper texture';
      layer1AestheticNegatives = [
        'glossy modern 3d',
        'harsh digital neon',
        'plastic skin',
        'modern UI overlays',
        ...negativeConstraints,
      ];
    } else if (archetype === 'kinetic_type') {
      lightingAndLens = `high-contrast studio lighting at ${aperture}, deep solid black shadows, clean rim highlights`;
      styleKeywords = 'bold graphic silhouette, stark minimalism, Swiss style composition, razor-sharp edge contrast';
      layer1AestheticNegatives = [
        'muddy gradients',
        'sepia tone',
        'soft unfocused edges',
        ...negativeConstraints,
      ];
    } else if (archetype === 'pop_bold') {
      lightingAndLens = `flat vibrant pop-art studio lighting at ${aperture}, zero gradients, hard graphic cast shadows`;
      styleKeywords = 'neo-brutalist pop aesthetic, chunky clean borders, bold solid color blocking';
      layer1AestheticNegatives = [
        'dull muted tones',
        'gritty cinematic realism',
        'gloomy shadows',
        ...negativeConstraints,
      ];
    }

    // 3. Two-Layer Negative Guards
    const layer2ArtifactNegatives = [
      'morphing anatomy',
      'temporal jitter',
      'flickering frames',
      'distorted hands',
      'extra limbs',
      'unnatural eye motion',
      'warped perspective',
      'low-bitrate compression artifacts',
      'watermarks',
      'text overlay',
      'floating disembodied objects',
    ];
    const combinedNegativeGuards = Array.from(
      new Set([...layer1AestheticNegatives, ...layer2ArtifactNegatives])
    ).join(', ');

    // 4. Project Subject Anchors Assembly
    let subjectAnchorPromptText = '';
    const referenceImageUrls: string[] = [];

    if (input.subjectAnchors && input.subjectAnchors.length > 0) {
      const descriptions = input.subjectAnchors.map((anchor) => {
        if (anchor.mediaUrl) {
          referenceImageUrls.push(anchor.mediaUrl);
        }
        let desc = `${anchor.name} (${anchor.coreDescription})`;
        if (anchor.variantDescription) {
          desc += `, wearing/featuring: ${anchor.variantDescription}`;
        }
        return desc;
      });
      subjectAnchorPromptText = `featuring ${descriptions.join('; ')}. `;
    }

    // Continuity and Audio Voiceover injection
    const continuityText = input.continuityContext ? ` Continuity: ${input.continuityContext}.` : '';
    const spokenText = input.spokenVoiceover ? ` Spoken line aligned: "${input.spokenVoiceover}".` : '';

    // Motion score mapping
    const motionSpeedMap: Record<string, { runwayMotion: number; label: string }> = {
      slow_cinematic: { runwayMotion: 3, label: 'gentle cinematic cadence' },
      normal: { runwayMotion: 5, label: 'natural steady speed' },
      high_energy: { runwayMotion: 8, label: 'dynamic high-energy motion' },
      time_lapse: { runwayMotion: 9, label: 'accelerated time-lapse pacing' },
    };
    const motionInfo = motionSpeedMap[input.motionSpeed || 'slow_cinematic'] || motionSpeedMap.slow_cinematic;

    // Aspect ratio dimensions
    const dims =
      input.aspectRatio === '9:16'
        ? { width: 1080, height: 1920, flag: '--ar 9:16', label: '9:16 vertical' }
        : input.aspectRatio === '16:9'
        ? { width: 1920, height: 1080, flag: '--ar 16:9', label: '16:9 widescreen' }
        : { width: 1080, height: 1080, flag: '--ar 1:1', label: '1:1 square' };

    const totalFrames = Math.round(duration * fps);
    const runwayDuration = duration <= 5 ? '5s' : '10s';

    // 5. Build Model-Tailored Syntax Formats
    const allPlatformPrompts: Record<string, PlatformPromptDetail> = {};

    // A. Runway Gen-3
    const runwayCore = `Cinematic video: ${subjectAnchorPromptText}${input.shotConcept}, ${shotTypeLabel}, ${moveDetails.narrative}, ${lightingAndLens}, color palette influenced by ${palette.background} and ${palette.accent}, ${styleKeywords}.${continuityText}`;
    const runwayParams = `${moveDetails.runwayTag}, motion: ${motionInfo.runwayMotion}, duration: ${runwayDuration}, aspect: ${input.aspectRatio}, resolution: 4k`;
    allPlatformPrompts['runway'] = {
      platform: 'Runway Gen-3',
      prompt: `${runwayCore}. ${runwayParams}`,
      fullString: `${runwayCore}. ${runwayParams}`,
      notes: `Run on Runway Gen-3 Alpha/Turbo (${runwayDuration}, ${input.aspectRatio}). If image reference is available, attach as first frame.`,
      referenceImageUrls,
      parameters: { duration: runwayDuration, motion: motionInfo.runwayMotion, cameraTag: moveDetails.runwayTag },
    };

    // B. Kling 1.5 / Pro
    const klingCore = `Shot of ${subjectAnchorPromptText}${input.shotConcept}, ${shotTypeLabel}, ${moveDetails.narrative}, ${lightingAndLens}, color tones of ${palette.accent}, ${styleKeywords}.${spokenText}`;
    const klingFull = `${klingCore}\n${moveDetails.klingTag}, Quality: Pro Mode, Duration: ${runwayDuration}\nNegative: ${combinedNegativeGuards}`;
    allPlatformPrompts['kling'] = {
      platform: 'Kling 1.5 / Pro',
      prompt: klingCore,
      negativePrompt: combinedNegativeGuards,
      fullString: klingFull,
      notes: `Set Kling duration to ${runwayDuration}, camera movement to "${moveDetails.label}", Pro Mode ON. Paste negative guard into negative prompt box.`,
      referenceImageUrls,
      parameters: { duration: runwayDuration, mode: 'pro', camera: moveDetails.klingTag },
    };

    // C. Luma Dream Machine
    const lumaCore = `${subjectAnchorPromptText}${input.shotConcept}, ${shotTypeLabel}, physical camera trajectory with ${moveDetails.narrative}, ${lightingAndLens}, consistent palette (${palette.background}, ${palette.accent}), seamless temporal continuity, ultra-detailed 4k.${continuityText}`;
    allPlatformPrompts['luma'] = {
      platform: 'Luma Dream Machine',
      prompt: lumaCore,
      fullString: `${lumaCore} --trajectory "${moveDetails.label}" --duration ${duration}s`,
      notes: `Paste into Luma Dream Machine. Attach initial reference image if anchoring a specific character or product pose.`,
      referenceImageUrls,
      parameters: { durationSec: duration, loopable: false },
    };

    // D. Minimax / Hailuo
    const minimaxPrompt = `A high-end cinematic take of ${subjectAnchorPromptText}${input.shotConcept}. The shot is framed as a ${shotTypeLabel} captured on a ${lens} lens at ${aperture}. ${moveDetails.narrative} with a ${motionInfo.label}. The scene is illuminated by ${lightingAndLens}, with color harmony balanced around ${palette.accent} and ${palette.background}. Motion remains stable, temporally coherent, and free of anatomical or perspective distortion.${continuityText}`;
    allPlatformPrompts['minimax'] = {
      platform: 'Minimax / Hailuo',
      prompt: minimaxPrompt,
      fullString: minimaxPrompt,
      notes: `Minimax thrives on complete natural sentences describing motion stability and camera action.`,
      referenceImageUrls,
    };

    // E. Local ComfyUI / AnimateDiff / SVD
    const comfyPositive = `${subjectAnchorPromptText}${input.shotConcept}, ${shotTypeLabel}, ${lens}, ${aperture}, ${moveDetails.label}, ${lightingAndLens}, ${styleKeywords}, palette ${palette.accent}`;
    const comfyFull = `Prompt: ${comfyPositive}\nNegative: ${combinedNegativeGuards}\n[ComfyUI Settings]: Width=${dims.width}, Height=${dims.height}, Frames=${totalFrames}, FPS=${fps}, CFG=7.5, MotionBucket=127`;
    allPlatformPrompts['comfyui'] = {
      platform: 'Local ComfyUI',
      prompt: comfyPositive,
      negativePrompt: combinedNegativeGuards,
      fullString: comfyFull,
      notes: `Configured for local offline generation with exact pixel dimensions and frame count.`,
      parameters: {
        width: dims.width,
        height: dims.height,
        frames: totalFrames,
        fps,
        cfg: 7.5,
        motionBucket: 127,
      },
      referenceImageUrls,
    };

    // F. Flux (Still Keyframe)
    const fluxPrompt = `${subjectAnchorPromptText}${input.shotConcept}, ${shotTypeLabel}, ${lightingAndLens}, colors centered around ${palette.accent}, ${styleKeywords}, photorealistic 8k detail, pristine focus`;
    allPlatformPrompts['flux'] = {
      platform: 'Flux (Still Keyframe)',
      prompt: fluxPrompt,
      fullString: fluxPrompt,
      notes: `Use Flux to generate hero concept keyframes and subject turnaround stills.`,
      referenceImageUrls,
    };

    // G. Midjourney (Still Keyframe)
    const mjPrompt = `${subjectAnchorPromptText}${input.shotConcept}, ${shotTypeLabel}, ${lightingAndLens}, color palette inspired by ${palette.background} and ${palette.accent}, ${styleKeywords} ${dims.flag} --style raw --v 6.1`;
    allPlatformPrompts['midjourney'] = {
      platform: 'Midjourney v6.1',
      prompt: mjPrompt,
      negativePrompt: `--no ${combinedNegativeGuards}`,
      fullString: `${mjPrompt} --no ${combinedNegativeGuards}`,
      notes: `Paste directly into Midjourney Discord or web alpha. Download image and drag into node dropzone.`,
      referenceImageUrls,
    };

    // H. ElevenLabs (Voiceover)
    const voiceoverText = input.spokenVoiceover || input.shotConcept;
    const elevenLabsPrompt = `Voice direction: Conversational, energetic yet authoritative creator voice, crisp microphone presence, close-mic proximity effect, zero room echo, natural micro-pauses. Spoken script: "${voiceoverText}"`;
    allPlatformPrompts['elevenlabs'] = {
      platform: 'ElevenLabs Voice',
      prompt: voiceoverText,
      fullString: elevenLabsPrompt,
      notes: `Paste the spoken script into ElevenLabs Speech Synthesis with Voice Design settings above.`,
    };

    // Pick target platform for main return
    const active = allPlatformPrompts[input.targetPlatform] || allPlatformPrompts['runway'];

    return {
      targetPlatform: input.targetPlatform,
      finalPrompt: active.prompt,
      negativePrompt: active.negativePrompt || combinedNegativeGuards,
      aspectRatioFlag: dims.flag,
      injectedStyleTokens: [
        `Archetype: ${archetype}`,
        `Palette: ${palette.background} / ${palette.accent}`,
        `Lens & Aperture: ${lens} ${aperture}`,
        `Camera Motion: ${moveDetails.label}`,
        `Duration: ${duration}s (${totalFrames} frames @ ${fps}fps)`,
        `Guards: Two-Layer Negative Defense Active`,
        ...(input.subjectAnchors && input.subjectAnchors.length > 0
          ? [`Subject Anchors: ${input.subjectAnchors.map((a) => a.name).join(', ')}`]
          : []),
      ],
      copyableFullString: active.fullString,
      guidanceNotes: active.notes,
      technicalParameters: {
        width: dims.width,
        height: dims.height,
        fps,
        durationSec: duration,
        totalFrames,
        aspectRatio: input.aspectRatio,
        motionSpeed: input.motionSpeed,
        lensFocalLength: lens,
        aperture,
        cameraMovement: move,
        ...(active.parameters || {}),
      },
      referenceImageUrls,
      allPlatformPrompts,
    };
  },
};
