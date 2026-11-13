import { z } from 'zod';
import { SkillDefinition, SkillExecutionContext } from '../core/types.js';

export interface CreativeSkillMeta {
  id: string;
  name: string;
  repo: string;
  author: string;
  category: 'motion' | 'direction' | 'audio' | 'assembly' | 'orchestration' | 'vector';
  relevantStages: Array<'ideation' | 'script' | 'assets' | 'shot' | 'footage' | 'vfx' | 'assembly' | 'render'>;
  description: string;
  keyDirectives: string[];
}

export const CREATIVE_SKILLS_CATALOG: Record<string, CreativeSkillMeta> = {
  'huashu-motion': {
    id: 'huashu-motion',
    name: 'Huashu Motion (alchaincyf)',
    repo: 'https://github.com/alchaincyf/huashu-motion',
    author: 'alchaincyf',
    category: 'motion',
    relevantStages: ['shot', 'vfx', 'assembly'],
    description:
      'Deterministic code-rendered commercial motion graphics, kinetic typography spring physics, subtitle animations, and Remotion/GSAP frame-accurate compositions.',
    keyDirectives: [
      'Kinetic typography spring physics with overshoot (stiffness: 180, damping: 14)',
      'High-contrast dual-tone typography with staggered per-word reveals',
      'Frame-accurate Remotion timeline sync without temporal drifting',
      'Motion blur compensation on fast tracking pans and typography pops',
    ],
  },
  'rossark-motion': {
    id: 'rossark-motion',
    name: 'Rossark Motion Choreography (rossark0)',
    repo: 'https://github.com/rossark0/rossark-motion-skill',
    author: 'rossark0',
    category: 'motion',
    relevantStages: ['assets', 'shot', 'vfx'],
    description:
      'Smooth 60fps natural animation physics, weight-shifting, lifelike idle breathing cycles, and non-teleporting easing curves for characters and UI assets.',
    keyDirectives: [
      'Continuous organic micro-motion (subtle 1-2% breathing scale loops, eye saccades, natural idle)',
      'Follow-through physics and overlapping actions on secondary elements (hair, fabric, particles)',
      'Cubic-bezier(0.16, 1, 0.3, 1) cinematic deceleration easing curves',
      'Zero rigid teleportation; all position transitions maintain momentum vectors',
    ],
  },
  'take-one': {
    id: 'take-one',
    name: 'Take-One Director (talsiach)',
    repo: 'https://github.com/talsiach/take-one',
    author: 'talsiach',
    category: 'direction',
    relevantStages: ['ideation', 'script', 'shot', 'footage'],
    description:
      'Full-spectrum multi-take commercial film director, actor facial seed consistency pinning, camera coverage matrix, and shot-to-prompt breakdown.',
    keyDirectives: [
      'Pin subject facial geometry, wardrobe, and lighting keys across multi-angle takes',
      'Multi-take coverage matrix: Master Wide (establishing), Medium OTS, Tight Close-Up, and Cutaway Detail',
      'Strict character seed consistency anchoring across disparate generative video models',
      'Cinematic contrast ratios (key-to-fill 4:1) with subtle edge separation rim lighting',
    ],
  },
  'reanimate': {
    id: 'reanimate',
    name: 'Reanimate Vector & Micro-Motion (NiazMorshed2007)',
    repo: 'https://github.com/NiazMorshed2007/reanimate',
    author: 'NiazMorshed2007',
    category: 'vector',
    relevantStages: ['assets', 'vfx'],
    description:
      'Reverse-engineers and synthesizes smooth SVG vector animations, path morphing, isometric UI infographics, and micro-interaction visual assets.',
    keyDirectives: [
      'Clean normalized SVG path morphology with equal point distributions for artifact-free morphing',
      'Isometric 30-degree projection with subtle chromatic aberration on interactive edges',
      'Lightweight vector asset generation ready for web and Remotion embedding',
    ],
  },
  'argo': {
    id: 'argo',
    name: 'Argo Pipeline Orchestrator (shreyaskarnik)',
    repo: 'https://github.com/shreyaskarnik/argo',
    author: 'shreyaskarnik',
    category: 'orchestration',
    relevantStages: ['ideation', 'assembly', 'render'],
    description:
      'Automated multimedia video demo orchestration, UI overlays, lower-thirds, highlight zooms, and Playwright-driven screen-to-film pipelines.',
    keyDirectives: [
      'Automated UI bounding-box zoom highlights with focal vignette dampening',
      'Synchronized lower-third title cards with entering slide-and-fade velocity',
      'Structured scene dependency graph ensuring assets precede footage takes',
    ],
  },
  'explainroo': {
    id: 'explainroo',
    name: 'Explainroo Narration Sync (vincentsch)',
    repo: 'https://github.com/vincentsch/explainroo',
    author: 'vincentsch',
    category: 'direction',
    relevantStages: ['script', 'assembly'],
    description:
      'Technical explainer video director, forced word-timing synchronization with Kokoro TTS/Whisper, and narration-matched callout animations.',
    keyDirectives: [
      'Sentence-level and word-level phoneme timecode mapping for sync with on-screen graphics',
      'Dynamic callout cards triggered precisely on stressed key terms',
      'Narrative rhythm matching: short punchy statements with visual punch-ins on keywords',
    ],
  },
  'video-director': {
    id: 'video-director',
    name: 'Cinematic Video Director (win4r)',
    repo: 'https://github.com/win4r/video-director',
    author: 'win4r',
    category: 'direction',
    relevantStages: ['shot', 'footage'],
    description:
      'Production-grade cinematic camera director, anamorphic lens optics, volumetric lighting, blocking depth, and model prompt standards for Runway, Kling, Luma & Sora.',
    keyDirectives: [
      'Anamorphic 2.39:1 aspect ratio directives with subtle horizontal streak flaring and oval bokeh',
      'Volumetric atmospheric fog (God rays, floating dust motes, haze depth layering)',
      'Exact camera rigs: Steadicam tracking, Technocrane sweep, Russian Arm low-angle pursuit',
      'Negative prompt guards against morphing limbs, rubbery plastic skin, and motion smears',
    ],
  },
  'earshot': {
    id: 'earshot',
    name: 'Earshot Foley & Audio Design (Leonxlnx)',
    repo: 'https://github.com/Leonxlnx/earshot',
    author: 'Leonxlnx',
    category: 'audio',
    relevantStages: ['script', 'footage', 'assembly'],
    description:
      'Acoustic sound design, procedural Foley sound effects, ambient environmental soundscapes, and cut-synced hit/riser audio cues.',
    keyDirectives: [
      'Three-tier acoustic sound design: Room Ambience + Primary Foley (footsteps, fabric, handling) + Action Stinger',
      'Stereo panning alignment matching spatial position of on-screen sound sources',
      'Sub-bass impact hits (40-60Hz) placed exactly on scene cuts or visual beat drops',
    ],
  },
  'cook': {
    id: 'cook',
    name: 'Cook Editorial Montage Assembly (Leonxlnx)',
    repo: 'https://github.com/Leonxlnx/cook',
    author: 'Leonxlnx',
    category: 'assembly',
    relevantStages: ['assembly', 'render'],
    description:
      'Autonomous video assembly and montage loop, rhythm-matched cuts, speed ramp transitions, reference-score benchmarking, and DaVinci multi-track recipe builder.',
    keyDirectives: [
      'Rhythm-matched montage cuts aligned with tempo grid (120 BPM = 0.5s half-beat, 1.0s whole-beat cuts)',
      'Speed ramp transitions: 300% velocity whip at cut point landing in 100% normal motion',
      'Visual continuity vectors: matching eyeline and motion direction across consecutive shots',
      'Reference benchmarking: measuring narrative density, color harmony, and shot variety against target',
    ],
  },
};

/**
 * Enriches a base prompt by applying the specialized directives of selected creative skills.
 */
export function enrichPromptWithCreativeSkills(
  basePrompt: string,
  stage: string,
  activeSkillIds: string[] = []
): {
  enrichedPrompt: string;
  appliedSkills: CreativeSkillMeta[];
  skillDirectives: string[];
} {
  // If no skills explicitly specified, auto-select the best skills for this stage
  const skillIdsToUse =
    activeSkillIds.length > 0
      ? activeSkillIds
      : Object.values(CREATIVE_SKILLS_CATALOG)
          .filter((s) => s.relevantStages.includes(stage as any))
          .slice(0, 3)
          .map((s) => s.id);

  const appliedSkills: CreativeSkillMeta[] = [];
  const skillDirectives: string[] = [];

  for (const id of skillIdsToUse) {
    const meta = CREATIVE_SKILLS_CATALOG[id];
    if (meta) {
      appliedSkills.push(meta);
      skillDirectives.push(...meta.keyDirectives);
    }
  }

  // Synthesize enriched prompt with professional cinematic directives
  let enriched = basePrompt.trim();

  // 1. Inject Camera & Optics if video-director or take-one is present
  if (skillIdsToUse.includes('video-director')) {
    enriched += ', shot on ARRI Alexa 65 with Panavision Anamorphic lenses, cinematic 8k, volumetric atmosphere, shallow depth of field f/1.8';
  }

  // 2. Inject Actor & Coverage if take-one is present
  if (skillIdsToUse.includes('take-one')) {
    enriched += ', precise character facial geometry locked, realistic skin micro-textures, 4:1 key-to-fill ratio, rim-lit silhouette';
  }

  // 3. Inject Motion Physics if rossark-motion or huashu-motion is present
  if (skillIdsToUse.includes('rossark-motion')) {
    enriched += ', smooth 60fps organic motion, subtle weight-shifting inertia, natural follow-through, zero abrupt snaps';
  } else if (skillIdsToUse.includes('huashu-motion')) {
    enriched += ', kinetic spring easing, high-energy dynamic motion blur, frame-accurate motion rhythm';
  }

  // 4. Inject Vector morphology if reanimate is present
  if (skillIdsToUse.includes('reanimate')) {
    enriched += ', clean vector path contours, isometric isometric projection, crisp modern editorial aesthetic';
  }

  return {
    enrichedPrompt: enriched,
    appliedSkills,
    skillDirectives,
  };
}

/**
 * Generates audio Foley/SFX cues for Earshot skill integration
 */
export function generateEarshotAudioCues(scriptOrConcept: string): Array<{
  timestampSec: number;
  type: 'ambience' | 'foley' | 'stinger' | 'music_bed';
  description: string;
  pan: 'left' | 'center' | 'right';
  gainDb: number;
}> {
  return [
    {
      timestampSec: 0.0,
      type: 'ambience',
      description: 'Subtle low-frequency atmospheric drone (50Hz hum) with airy room tone',
      pan: 'center',
      gainDb: -14,
    },
    {
      timestampSec: 0.8,
      type: 'stinger',
      description: 'Soft cinematic sub-boom riser accentuating opening visual focus',
      pan: 'center',
      gainDb: -6,
    },
    {
      timestampSec: 2.2,
      type: 'foley',
      description: 'Crisp mechanical tactile click / tactile glass interface contact',
      pan: 'right',
      gainDb: -9,
    },
    {
      timestampSec: 3.5,
      type: 'foley',
      description: 'Fluid cloth / movement whoosh transitioning out of scene',
      pan: 'left',
      gainDb: -12,
    },
  ];
}

/**
 * Generates an automated Cook Montage Recipe for editorial assembly
 */
export function generateCookMontageRecipe(
  projectName: string,
  totalDurationSec: number,
  bpm: number = 120
): {
  recipeName: string;
  bpm: number;
  cuts: Array<{
    shotIndex: number;
    durationSec: number;
    transitionType: 'hard_cut' | 'speed_ramp_in' | 'whip_pan' | 'fade_black';
    eyelineVector: 'left_to_right' | 'center' | 'right_to_left';
    pacingRule: string;
  }>;
} {
  const beatSec = 60 / bpm; // e.g. 0.5s per beat
  const cuts = [];
  let elapsed = 0;
  let idx = 1;

  while (elapsed < totalDurationSec) {
    const isPacedDown = idx % 4 === 0;
    const dur = isPacedDown ? Math.min(beatSec * 4, totalDurationSec - elapsed) : Math.min(beatSec * 2, totalDurationSec - elapsed);
    if (dur <= 0) break;

    cuts.push({
      shotIndex: idx,
      durationSec: parseFloat(dur.toFixed(2)),
      transitionType: (idx === 1 ? 'hard_cut' : idx % 3 === 0 ? 'speed_ramp_in' : 'hard_cut') as 'hard_cut' | 'speed_ramp_in' | 'whip_pan' | 'fade_black',
      eyelineVector: (idx % 2 === 0 ? 'left_to_right' : 'right_to_left') as 'left_to_right' | 'center' | 'right_to_left',
      pacingRule: isPacedDown ? 'Hero beat pause (hold viewer attention)' : 'Rapid narrative acceleration',
    });

    elapsed += dur;
    idx++;
  }

  return {
    recipeName: `${projectName} — Cook Rhythm Cut (${bpm} BPM)`,
    bpm,
    cuts,
  };
}
