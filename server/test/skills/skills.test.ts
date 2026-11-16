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
    expect(SkillRegistry.get('skill-asset-generator')).toBeDefined();
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

  it('skillPromptSynthesizer synthesizes rich contextual prompt with optics, camera motion, continuity, subject anchors, and 2-layer negative guards', async () => {
    const richOut = await skillPromptSynthesizer.execute(
      {
        targetPlatform: 'runway',
        shotConcept: 'Founder demonstrates next-generation biometric interface',
        aspectRatio: '9:16',
        durationSec: 5,
        fps: 30,
        shotType: 'medium_shot',
        lensFocalLength: '35mm',
        aperture: 'f/1.8',
        cameraMovement: 'slow_dolly_in',
        motionSpeed: 'slow_cinematic',
        continuityContext: 'Incoming from wide laboratory reveal at 00:03',
        spokenVoiceover: 'Everything you touch transforms in real time.',
        subjectAnchors: [
          {
            id: 'subj_anya',
            name: 'Anya - Lead Presenter',
            coreDescription: 'Early 30s female tech founder, sharp features, short dark hair',
            variantLabel: 'Charcoal Blazer',
            variantDescription: 'Tailored charcoal wool blazer with collarless silk shirt',
            mediaUrl: 'assets/subjects/subj_anya/var_01.png',
          },
        ],
      },
      {
        projectRoot: '/tmp',
        styleTokensJson: {
          palette: { background: '#0B0F19', accent: '#38BDF8' },
          archetype: 'liquid_glass',
          negativeConstraints: ['no cheesy smiles', 'no glossy 3d render look'],
        },
      }
    );

    expect(richOut.targetPlatform).toBe('runway');
    // Check subject anchor injection
    expect(richOut.finalPrompt).toContain('Anya - Lead Presenter');
    expect(richOut.finalPrompt).toContain('Tailored charcoal wool blazer');
    // Check optics & camera motion
    expect(richOut.finalPrompt).toContain('35mm prime lens at f/1.8');
    expect(richOut.finalPrompt).toContain('camera: push in slowly');
    expect(richOut.finalPrompt).toContain('duration: 5s');
    // Check reference image preservation
    expect(richOut.referenceImageUrls).toContain('assets/subjects/subj_anya/var_01.png');

    // Check Kling platform detail with two-layer negative guards
    const kling = richOut.allPlatformPrompts['kling'];
    expect(kling).toBeDefined();
    expect(kling.prompt).toContain('Anya - Lead Presenter');
    expect(kling.fullString).toContain('Camera Movement: Zoom In (Gentle)');
    expect(kling.negativePrompt).toContain('no cheesy smiles'); // Layer 1 aesthetic rule
    expect(kling.negativePrompt).toContain('morphing anatomy'); // Layer 2 video artifact guard
    expect(kling.negativePrompt).toContain('temporal jitter');

    // Check Minimax natural descriptive narrative format
    const minimax = richOut.allPlatformPrompts['minimax'];
    expect(minimax).toBeDefined();
    expect(minimax.prompt).toContain('A high-end cinematic take of featuring Anya - Lead Presenter');
    expect(minimax.prompt).toContain('35mm lens at f/1.8');

    // Check ComfyUI exact technical settings
    const comfy = richOut.allPlatformPrompts['comfyui'];
    expect(comfy).toBeDefined();
    expect(comfy.parameters?.width).toBe(1080);
    expect(comfy.parameters?.height).toBe(1920);
    expect(comfy.parameters?.frames).toBe(150); // 5s * 30fps = 150 frames
    expect(comfy.parameters?.fps).toBe(30);

    // Check ElevenLabs voice direction
    const elevenlabs = richOut.allPlatformPrompts['elevenlabs'];
    expect(elevenlabs).toBeDefined();
    expect(elevenlabs.fullString).toContain('Everything you touch transforms in real time.');
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
    expect(result.fcpxmlContent).toContain('width="1080" height="1920"');
    expect(result.fcpxmlContent).toContain('V1_footage/scene_01.mp4');
    expect(result.fcpxmlContent).toContain('V2_overlay/card_01.mov');
    expect(result.edlContent).toContain('TITLE: AI Reel Project 01');
    expect(result.srtContent).toBe('');
  });

  it('skillAssetGenerator enforces Three-Pillar Style Lock across different subjects (e.g. Girl and Boy)', async () => {
    // 1. Generate First Asset (Girl / Anya) without Master Anchor
    const girlAsset: any = await SkillRegistry.execute(
      'skill-asset-generator',
      {
        subjectName: 'Anya - Lead Presenter',
        category: 'character',
        coreDescription: 'Early 30s female tech founder, sharp features, short dark hair',
        variantLabel: 'Formal Charcoal Blazer',
        turnaroundAngle: 'portrait',
        targetPlatform: 'midjourney',
      },
      {
        projectRoot: '/tmp',
        styleTokensJson: {
          palette: { background: '#0F172A', accent: '#38BDF8' },
          archetype: 'liquid_glass',
          negativeConstraints: ['no plastic skin', 'no oversaturated glow'],
        },
      }
    );

    expect(girlAsset.synthesizedPrompt).toContain('Character turnaround portrait of Anya - Lead Presenter');
    expect(girlAsset.synthesizedPrompt).toContain('50mm prime portrait lens');
    expect(girlAsset.fullString).toContain('--v 6.1');
    expect(girlAsset.negativeGuards).toContain('no plastic skin');
    expect(girlAsset.negativeGuards).toContain('distorted hands'); // 2-layer negative guard

    // 2. Generate Second Asset (Boy / Marcus) WITH Anya as Master Style Anchor (--sref)
    const anyaAnchorUrl = 'assets/subjects/anya/var_01.png';
    const boyAsset: any = await SkillRegistry.execute(
      'skill-asset-generator',
      {
        subjectName: 'Marcus - Chief Architect',
        category: 'character',
        coreDescription: 'Late 30s male engineer, strong jawline, neat dark beard',
        variantLabel: 'Studio Turnaround',
        turnaroundAngle: 'three_quarter',
        masterStyleAnchorAssetUrl: anyaAnchorUrl,
        targetPlatform: 'midjourney',
      },
      {
        projectRoot: '/tmp',
        styleTokensJson: {
          palette: { background: '#0F172A', accent: '#38BDF8' },
          archetype: 'liquid_glass',
          negativeConstraints: ['no plastic skin', 'no oversaturated glow'],
        },
      }
    );

    // Verify Three-Pillar Style Parity Lock
    expect(boyAsset.synthesizedPrompt).toContain('Character turnaround portrait of Marcus - Chief Architect');
    expect(boyAsset.synthesizedPrompt).toContain('35mm cinema lens'); // Injected Style DNA
    // Pillar 2: Master Style Anchor --sref automatically appended
    expect(boyAsset.fullString).toContain(`--sref ${anyaAnchorUrl} --sw 100`);
    expect(boyAsset.instructions).toContain(anyaAnchorUrl);
    // Pillar 3: Identical negative guards
    expect(boyAsset.negativeGuards).toEqual(girlAsset.negativeGuards);
  });
});
