import { describe, it, expect } from 'vitest';
import {
  initializeSkills,
  SkillRegistry,
  skillTasteMixer,
  skillPromptSynthesizer,
  skillFCPXMLBuilder,
  TasteAnalysisOutput,
} from '../../src/skills/index.js';

describe('Atomic Skill Swarm Suite', () => {
  initializeSkills();

  it('registers all atomic skills in SkillRegistry', () => {
    const list = SkillRegistry.list();
    expect(list.length).toBeGreaterThanOrEqual(5);
    expect(SkillRegistry.get('skill-taste-analyzer')).toBeDefined();
    expect(SkillRegistry.get('skill-taste-mixer')).toBeDefined();
    expect(SkillRegistry.get('skill-hook-generator')).toBeDefined();
    expect(SkillRegistry.get('skill-beat-scriptwriter')).toBeDefined();
    expect(SkillRegistry.get('skill-prompt-synthesizer')).toBeDefined();
    expect(SkillRegistry.get('skill-fcpxml-builder')).toBeDefined();
  });

  it('skillTasteMixer combines attributes across multiple references accurately', async () => {
    const ref1: TasteAnalysisOutput = {
      referenceId: 'ref_1',
      archetype: 'editorial_grain',
      pacing: {
        avgCutDurationSec: 2.1,
        rhythm: 'cinematic_unhurried',
        usefulPauses: true,
      },
      palette: {
        background: '#EFE8DC',
        card: '#FFFFFF',
        accent: '#C2412D',
        text: '#1A1A1A',
      },
      typography: {
        displayFont: 'InstrumentSerif-400',
        bodyFont: 'Inter-400',
        headingCase: 'mixed',
      },
      motion: {
        easingCurve: 'power3.out',
        overshoot: false,
        primaryMoves: ['rise', 'slide-in'],
      },
      audioRules: {
        targetLufs: -14,
        musicDuckingDb: 18,
        sfxSignature: ['soft_click'],
      },
      negativeConstraints: ['No neon colors', 'No bouncing'],
      styleDocMarkdown: '# Ref 1 Style',
    };

    const ref2: TasteAnalysisOutput = {
      referenceId: 'ref_2',
      archetype: 'liquid_glass',
      pacing: {
        avgCutDurationSec: 1.4,
        rhythm: 'fast_snappy',
        usefulPauses: false,
      },
      palette: {
        background: '#0B0F19',
        card: '#1E293B',
        accent: '#38BDF8',
        text: '#F8FAFC',
      },
      typography: {
        displayFont: 'ArchivoBlack-400',
        bodyFont: 'Inter-400',
        headingCase: 'uppercase',
      },
      motion: {
        easingCurve: 'power4.out',
        overshoot: true,
        primaryMoves: ['pop', 'count-up', 'checklist-tick'],
      },
      audioRules: {
        targetLufs: -14,
        musicDuckingDb: 12,
        sfxSignature: ['pop', 'counter_roll', 'chime'],
      },
      negativeConstraints: ['No glossy fake 3d', 'No unmotivated whooshes'],
      styleDocMarkdown: '# Ref 2 Style',
    };

    const composite = await skillTasteMixer.execute(
      {
        references: [ref1, ref2],
        attributeMap: {
          pacingFromRefId: 'ref_2', // Take fast pacing from Ref 2
          paletteFromRefId: 'ref_2', // Take dark neon palette from Ref 2
          typographyFromRefId: 'ref_1', // Take serif typography from Ref 1
          motionFromRefId: 'ref_2', // Take snappy motion from Ref 2
          audioFromRefId: 'ref_2',
        },
        customNegativeConstraints: ['No blurry text'],
      },
      { projectRoot: '/tmp' }
    );

    expect(composite.pacing.avgCutDurationSec).toBe(1.4);
    expect(composite.palette.background).toBe('#0B0F19');
    expect(composite.typography.displayFont).toBe('InstrumentSerif-400');
    expect(composite.motion.overshoot).toBe(true);
    expect(composite.styleMarkdown).toContain('PROJECT STYLE GUIDE');
    expect(composite.negativeConstraints).toContain('No blurry text');
  });

  it('skillPromptSynthesizer synthesizes platform-locked prompts for Midjourney, Runway, and ElevenLabs', async () => {
    const out = await skillPromptSynthesizer.execute(
      {
        targetPlatform: 'midjourney',
        shotConcept: 'Futuristic glass server rack glowing with fiber optic light',
        aspectRatio: '9:16',
        durationSec: 4,
        shotType: 'macro_detail',
      },
      {
        projectRoot: '/tmp',
        styleTokensJson: {
          palette: { background: '#0F172A', accent: '#38BDF8' },
          archetype: 'liquid_glass',
        },
      }
    );

    expect(out.targetPlatform).toBe('midjourney');
    expect(out.finalPrompt).toContain('Futuristic glass server rack');
    expect(out.finalPrompt).toContain('--ar 9:16');
    expect(out.finalPrompt).toContain('#38BDF8');
    expect(out.copyableFullString).toContain('--no');
  });

  it('skillFCPXMLBuilder generates valid FCPXML v1.10 and EDL multi-track timeline documents', async () => {
    const result = await skillFCPXMLBuilder.execute(
      {
        projectName: 'AI Reel Project 01',
        totalDurationSec: 15,
        fps: 30,
        width: 1080,
        height: 1920,
        clips: [
          {
            id: 'c1',
            name: 'Scene 1 Background',
            relativeFilePath: 'V1_footage/scene_01.mp4',
            startSec: 0,
            durationSec: 5,
            track: 'V1_footage',
          },
          {
            id: 'c2',
            name: 'Scene 1 Overlay Card',
            relativeFilePath: 'V2_overlay/card_01.mov',
            startSec: 0.5,
            durationSec: 4.5,
            track: 'V2_overlay',
          },
          {
            id: 'c3',
            name: 'Voiceover Stem',
            relativeFilePath: 'A1_dialogue/master_voice.wav',
            startSec: 0,
            durationSec: 15,
            track: 'A1_dialogue',
          },
        ],
      },
      { projectRoot: '/tmp' }
    );

    expect(result.fcpxmlContent).toContain('<fcpxml version="1.10">');
    expect(result.fcpxmlContent).toContain('FFVideoFormat1080x1920p30');
    expect(result.fcpxmlContent).toContain('V1_footage/scene_01.mp4');
    expect(result.fcpxmlContent).toContain('V2_overlay/card_01.mov');
    expect(result.edlContent).toContain('TITLE: AI Reel Project 01');
    expect(result.srtContent).toContain('Voiceover Stem');
  });
});
