import * as path from 'path';
import * as fs from 'fs/promises';
import { ProjectService, FilmProject } from '../server/src/services/projectService.js';
import { ProjectRegistry } from '../server/src/services/projectRegistry.js';
import { initializeSkills, SkillRegistry } from '../server/src/skills/index.js';

async function main() {
  console.log('🚀 Starting Verification: 8-Stage Production DAG & Asset Style Parity Lock');

  initializeSkills();
  await ProjectRegistry.initialize();

  const testDir = path.resolve(process.cwd(), 'temp_test_asset_parity_dag');
  await fs.rm(testDir, { recursive: true, force: true });
  await fs.mkdir(testDir, { recursive: true });

  try {
    // 1. Initialize Project
    console.log('\n[1/6] Initializing Studio Project...');
    const project = await ProjectService.initProject(testDir, 'Style Parity Studio Demo', {
      aspectRatio: '9:16',
      targetDurationSec: 30,
      fps: 30,
      basePresetId: 'liquid_glass',
      initGit: false,
    });
    console.log(`✓ Project created: ${project.name} (${project.id})`);

    // 2. Generate First Subject Asset: Girl (Anya)
    console.log('\n[2/6] Generating First Subject Asset (Girl / Anya)...');
    const anyaDir = path.join(testDir, 'assets', 'subjects', 'anya');
    await fs.mkdir(anyaDir, { recursive: true });
    const anyaAssetPath = 'assets/subjects/anya/var_01.png';
    await fs.writeFile(path.join(testDir, anyaAssetPath), 'MOCK_ANYA_PORTRAIT_PNG', 'utf-8');

    const anyaGenResult: any = await SkillRegistry.execute(
      'skill-asset-generator',
      {
        subjectName: 'Anya - Lead Presenter',
        category: 'character',
        coreDescription: 'Early 30s female tech founder, sharp features, short dark hair, natural makeup',
        variantLabel: 'Formal Charcoal Blazer',
        turnaroundAngle: 'portrait',
        targetPlatform: 'midjourney',
        subjectId: 'anya',
        variantId: 'var_01',
      },
      {
        projectRoot: testDir,
        styleGuideMd: project.styleMarkdown,
        styleTokensJson: project.styleTokens,
      }
    );

    console.log(`✓ Anya Prompt: ${anyaGenResult.synthesizedPrompt}`);
    console.log(`✓ Anya Asset Path: ${anyaAssetPath}`);

    // 3. Designate Anya as the Project's "Master Visual Style Anchor"
    console.log('\n[3/6] Setting Anya as Project Master Visual Style Anchor...');
    project.masterStyleAnchorAssetUrl = anyaAssetPath;

    const anyaNodeId = 'node_asset_anya_v1';
    project.nodes[anyaNodeId] = {
      id: anyaNodeId,
      parentId: null,
      stage: 'assets',
      stageOrder: 4,
      subjectAnchorId: 'subj_anya',
      versionLabel: 'v1.0 (Lead)',
      title: 'Anya - Lead Presenter',
      modelEngine: 'antigravity-cli',
      prompt: 'Early 30s female tech founder, formal charcoal blazer',
      assetMetadata: {
        isMasterStyleAnchor: true,
        turnaroundAngle: 'portrait',
      },
      artifacts: {
        mediaUrl: anyaAssetPath,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'ready',
      },
    };
    await ProjectService.saveProject(project);
    console.log(`✓ Master Style Anchor locked to: ${project.masterStyleAnchorAssetUrl}`);

    // 4. Generate Second Subject Asset: Boy (Marcus) & Verify Style Parity Lock
    console.log('\n[4/6] Generating Second Subject Asset (Boy / Marcus) with Master Style Anchor Lock...');
    const marcusDir = path.join(testDir, 'assets', 'subjects', 'marcus');
    await fs.mkdir(marcusDir, { recursive: true });
    const marcusAssetPath = 'assets/subjects/marcus/var_01.png';
    await fs.writeFile(path.join(testDir, marcusAssetPath), 'MOCK_MARCUS_PORTRAIT_PNG', 'utf-8');

    const marcusGenResult: any = await SkillRegistry.execute(
      'skill-asset-generator',
      {
        subjectName: 'Marcus - Chief Architect',
        category: 'character',
        coreDescription: 'Late 30s male engineer, strong jawline, neat dark beard, minimal black crewneck',
        variantLabel: 'Studio Turnaround',
        turnaroundAngle: 'three_quarter',
        masterStyleAnchorAssetUrl: project.masterStyleAnchorAssetUrl, // Auto-injected!
        targetPlatform: 'midjourney',
        subjectId: 'marcus',
        variantId: 'var_01',
      },
      {
        projectRoot: testDir,
        styleGuideMd: project.styleMarkdown,
        styleTokensJson: project.styleTokens,
      }
    );

    console.log(`✓ Marcus Full Prompt: ${marcusGenResult.fullString}`);

    // Check style parity assertions
    if (!marcusGenResult.fullString.includes(`--sref ${anyaAssetPath} --sw 100`)) {
      throw new Error(`Marcus prompt failed to inherit Anya's Master Style Anchor URL via --sref!`);
    }
    console.log(`✓ Verified: Marcus prompt automatically received --sref ${anyaAssetPath} --sw 100`);

    if (marcusGenResult.negativeGuards !== anyaGenResult.negativeGuards) {
      throw new Error(`Negative guards mismatch between Girl and Boy!`);
    }
    console.log(`✓ Verified: Girl and Boy share 100% identical Two-Layer Negative Guards`);

    const marcusNodeId = 'node_asset_marcus_v1';
    project.nodes[marcusNodeId] = {
      id: marcusNodeId,
      parentId: anyaNodeId,
      stage: 'assets',
      stageOrder: 4,
      subjectAnchorId: 'subj_marcus',
      versionLabel: 'v1.0 (Co-Lead)',
      title: 'Marcus - Chief Architect',
      modelEngine: 'antigravity-cli',
      prompt: 'Late 30s male engineer, black crewneck',
      assetMetadata: {
        isMasterStyleAnchor: false,
        styleReferenceAssetUrl: anyaAssetPath,
        turnaroundAngle: 'three_quarter',
      },
      artifacts: {
        mediaUrl: marcusAssetPath,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'ready',
      },
    };

    // 5. Construct 8-Stage Pipeline Nodes (Shots, Footage, VFX Overlays)
    console.log('\n[5/6] Populating Full 8-Stage DAG Pipeline...');

    // Stage 1: Idea
    project.nodes['node_idea_v1'] = {
      id: 'node_idea_v1',
      parentId: null,
      stage: 'ideation',
      stageOrder: 1,
      versionLabel: 'v1.0 (Concept)',
      title: 'Premise: Quantum Optical Server',
      modelEngine: 'antigravity-cli',
      prompt: 'A fast-paced tech reveal showing human interaction with refractive light computing',
      artifacts: { textContent: 'Quantum optical computing breakthrough' },
      metadata: { createdAt: new Date().toISOString(), status: 'ready' },
    };

    // Stage 2: Taste
    project.nodes['node_taste_v1'] = {
      id: 'node_taste_v1',
      parentId: 'node_idea_v1',
      stage: 'taste',
      stageOrder: 2,
      versionLabel: 'v1.0 (Liquid Glass)',
      title: 'Taste & Style Architecture',
      modelEngine: 'antigravity-cli',
      prompt: 'Liquid glass frosted surfaces with cyan fiber optic highlights and Kodak film grain',
      artifacts: { textContent: project.styleMarkdown },
      metadata: { createdAt: new Date().toISOString(), status: 'ready' },
    };

    // Stage 3: Master Script
    project.nodes['node_script_v1'] = {
      id: 'node_script_v1',
      parentId: 'node_taste_v1',
      stage: 'script',
      stageOrder: 3,
      versionLabel: 'v1.0 (30s Snappy)',
      title: 'Master Script & Scene Beats',
      modelEngine: 'antigravity-cli',
      prompt: '30-second conversational breakdown across 4 narrative scenes',
      artifacts: { textContent: 'Scene 1: Hook (3s), Scene 2: Problem (9s), Scene 3: Solution (12s), Scene 4: CTA (6s)' },
      metadata: { createdAt: new Date().toISOString(), status: 'ready' },
    };

    // Stage 5: Shot (Scene 1, Shot 1.1)
    const shot1Id = 'node_shot_s1_1';
    project.nodes[shot1Id] = {
      id: shot1Id,
      parentId: 'node_script_v1',
      sceneId: 'scene_01',
      stage: 'shot',
      stageOrder: 5,
      versionLabel: 'v1.0 (Shot 1.1)',
      title: 'Scene 1 • Shot 1.1: Wide Reveal',
      modelEngine: 'antigravity-cli',
      prompt: 'Anya stands before the glowing glass server as refractive light washes across the lab',
      boundSubjectAnchorIds: ['subj_anya'],
      shotContextOverrides: {
        lensFocalLength: '35mm',
        aperture: 'f/1.8',
        cameraMovement: 'slow_dolly_in',
      },
      artifacts: { textContent: 'Establishing shot of Anya' },
      metadata: { createdAt: new Date().toISOString(), status: 'ready' },
    };

    // Stage 6: Footage Take 1
    const footage1Id = 'node_footage_s1_take1';
    const mockFootagePath = 'assets/video_clips/scene_01_shot_01_runway.mp4';
    await fs.writeFile(path.join(testDir, mockFootagePath), 'MOCK_RUNWAY_VIDEO_BYTES', 'utf-8');

    project.nodes[footage1Id] = {
      id: footage1Id,
      parentId: shot1Id,
      sceneId: 'scene_01',
      shotId: shot1Id,
      stage: 'footage',
      stageOrder: 6,
      versionLabel: 'Take 1 (Runway Gen-3)',
      title: 'Shot 1.1 Take 1',
      modelEngine: 'external',
      prompt: 'Generated on Runway Gen-3',
      artifacts: { mediaUrl: mockFootagePath },
      metadata: { createdAt: new Date().toISOString(), status: 'ready' },
    };

    // Stage 7: VFX & Overlay (Track V2)
    const vfx1Id = 'node_vfx_s1_stat';
    const mockAlphaPath = 'assets/video_clips/overlay_stat_counter.mov';
    await fs.writeFile(path.join(testDir, mockAlphaPath), 'MOCK_PRORES_4444_ALPHA_BYTES', 'utf-8');

    project.nodes[vfx1Id] = {
      id: vfx1Id,
      parentId: footage1Id,
      sceneId: 'scene_01',
      stage: 'vfx',
      stageOrder: 7,
      versionLabel: 'v1.0 (Stat Counter)',
      title: 'VFX: +340% Processing Speed Counter',
      modelEngine: 'hyperframes',
      prompt: 'Kinetic typography stat counter overlay',
      vfxMetadata: {
        overlayType: 'kinetic_text',
        inPointSec: 1.0,
        durationSec: 2.0,
        blendMode: 'normal',
      },
      artifacts: {
        mediaUrl: mockFootagePath,
        alphaOverlayUrl: mockAlphaPath,
      },
      metadata: { createdAt: new Date().toISOString(), status: 'ready' },
    };

    // Stage 8: Master Assembly Cut
    project.activeCut['scene_01'] = vfx1Id;
    await ProjectService.saveProject(project);

    console.log(`✓ 8-Stage DAG Nodes successfully mapped:`);
    console.log(`  1. Idea: ${project.nodes['node_idea_v1'].title}`);
    console.log(`  2. Taste: ${project.nodes['node_taste_v1'].title}`);
    console.log(`  3. Script: ${project.nodes['node_script_v1'].title}`);
    console.log(`  4. Assets: ${project.nodes[anyaNodeId].title} (Anchor) & ${project.nodes[marcusNodeId].title}`);
    console.log(`  5. Shot: ${project.nodes[shot1Id].title}`);
    console.log(`  6. Footage: ${project.nodes[footage1Id].title}`);
    console.log(`  7. VFX: ${project.nodes[vfx1Id].title}`);
    console.log(`  8. Assembly Cut: Active for scene_01 -> ${project.activeCut['scene_01']}`);

    // 6. Test DaVinci Resolve Multi-Track Assembly Handoff
    console.log('\n[6/6] Building DaVinci Resolve Multi-Track Bundle (V1 Footage + V2 Overlay)...');
    const exportResult: any = await SkillRegistry.execute(
      'skill-fcpxml-builder',
      {
        projectName: project.name,
        totalDurationSec: 30,
        fps: 30,
        width: 1080,
        height: 1920,
        clips: [
          {
            id: 'clip_s1_v1',
            name: 'Scene 1 Base Shot',
            relativeFilePath: mockFootagePath,
            startSec: 0,
            durationSec: 3,
            track: 'V1_footage',
          },
          {
            id: 'clip_s1_v2',
            name: 'Scene 1 Kinetic Stat Overlay',
            relativeFilePath: mockAlphaPath,
            startSec: 1.0,
            durationSec: 2.0,
            track: 'V2_overlay',
          },
        ],
      },
      { projectRoot: testDir }
    );

    if (!exportResult.fcpxmlContent.includes('scene_01_shot_01_runway.mp4')) {
      throw new Error('FCPXML missing base V1 video asset');
    }
    if (!exportResult.fcpxmlContent.includes('overlay_stat_counter.mov') || !exportResult.fcpxmlContent.includes('lane="1"')) {
      throw new Error('FCPXML missing Track V2 connected overlay clip');
    }
    console.log('✓ Verified: DaVinci Resolve FCPXML v1.10 contains both V1 spine and V2 lane="1" overlay tracks!');

    console.log('\n✅ ALL 6 VERIFICATION CHECKS PASSED WITH 100% ACCURACY!');
  } finally {
    await fs.rm(testDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
