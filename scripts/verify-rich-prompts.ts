import * as path from 'path';
import * as fs from 'fs/promises';
import { ProjectService } from '../server/src/services/projectService.js';
import { ProjectRegistry } from '../server/src/services/projectRegistry.js';
import { initializeSkills, SkillRegistry } from '../server/src/skills/index.js';

async function main() {
  console.log('🚀 Starting Verification: Rich Context Video Prompts & Subject Anchors');

  initializeSkills();
  await ProjectRegistry.initialize();

  const testDir = path.resolve(process.cwd(), 'temp_test_rich_prompt_project');
  await fs.rm(testDir, { recursive: true, force: true });
  await fs.mkdir(testDir, { recursive: true });

  try {
    // 1. Initialize a 9:16 vertical video project with editorial_grain base style
    console.log('\n[1/5] Initializing Test Project...');
    const project = await ProjectService.initProject(testDir, 'Rich Prompt Studio Demo', {
      aspectRatio: '9:16',
      targetDurationSec: 30,
      fps: 30,
      basePresetId: 'editorial_grain',
      initGit: false,
    });

    console.log(`✓ Project initialized: ${project.name} (${project.id})`);
    console.log(`✓ Aspect ratio: ${project.aspectRatio}, Duration: ${project.targetDurationSec}s, FPS: ${project.fps}`);
    console.log(`✓ Scenes count: ${project.scenes.length}`);

    // Verify assets/subjects directory was created
    const subjectsDirExists = await fs
      .access(path.join(testDir, 'assets', 'subjects'))
      .then(() => true)
      .catch(() => false);
    if (!subjectsDirExists) {
      throw new Error('assets/subjects directory was not created!');
    }
    console.log('✓ Verified: assets/subjects/ directory exists on disk');

    // 2. Add Subject Anchors (Presenter with 2 variants, and Product)
    console.log('\n[2/5] Creating Project Subject Anchors & Asset Variants...');
    const presenterId = 'subj_anya_lead';
    const presenterDir = path.join(testDir, 'assets', 'subjects', presenterId);
    await fs.mkdir(presenterDir, { recursive: true });

    // Mock asset file preservation
    const mockTurnaround1 = path.join(presenterDir, 'var_formal_01.png');
    await fs.writeFile(mockTurnaround1, 'MOCK_PNG_IMAGE_BYTES_VAR_1', 'utf-8');

    const presenterAnchor = {
      id: presenterId,
      name: 'Anya - Lead Presenter',
      category: 'character' as const,
      coreDescription: 'Early 30s female tech founder, sharp features, short dark hair, natural studio makeup',
      variants: [
        {
          id: 'var_formal',
          label: 'Formal Charcoal Blazer',
          promptDescription: 'Tailored charcoal wool blazer with collarless silk shirt',
          mediaUrl: `assets/subjects/${presenterId}/var_formal_01.png`,
          isDefault: true,
          createdAt: Date.now(),
        },
        {
          id: 'var_casual',
          label: 'Casual Studio Crewneck',
          promptDescription: 'Minimalist black matte crewneck sweater',
          mediaUrl: `assets/subjects/${presenterId}/var_casual_01.png`,
          isDefault: false,
          createdAt: Date.now(),
        },
      ],
      activeVariantId: 'var_formal',
      createdAt: Date.now(),
    };

    const productAnchor = {
      id: 'subj_liquid_rack',
      name: 'Liquid Glass Core Server',
      category: 'product' as const,
      coreDescription: 'Frosted acrylic edge-lit server chassis with visible refractive optical waveguides',
      variants: [
        {
          id: 'var_iso',
          label: 'Isometric 3/4 Glow',
          promptDescription: 'Refractive edge-lit front perspective with cyan fiber optic pulse',
          mediaUrl: `assets/subjects/subj_liquid_rack/var_iso_01.png`,
          isDefault: true,
          createdAt: Date.now(),
        },
      ],
      activeVariantId: 'var_iso',
      createdAt: Date.now(),
    };

    project.subjectAnchors = [presenterAnchor, productAnchor];
    await ProjectService.saveProject(project);

    console.log(`✓ Preserved 2 subject anchors in .studio/project.json`);
    console.log(`✓ Anya variants: ${presenterAnchor.variants.map((v) => v.label).join(', ')}`);
    console.log(`✓ Asset turnaround preserved: ${mockTurnaround1}`);

    // 3. Bind Anchors & Apply Shot Overrides to Scene 1 Node
    console.log('\n[3/5] Binding Anchors & Configuring Scene 1 Shot Director Overrides...');
    const scene1NodeId = project.activeCut[project.scenes[0].id];
    const node1 = project.nodes[scene1NodeId];

    node1.boundSubjectAnchorIds = [presenterId, 'subj_liquid_rack'];
    node1.shotContextOverrides = {
      lensFocalLength: '35mm',
      aperture: 'f/1.8',
      cameraMovement: 'slow_dolly_in',
      motionSpeed: 'slow_cinematic',
      continuityNotes: 'Cold open hook shot establishing the technological breakthrough',
    };
    node1.prompt = 'Presenter gazes into the edge-lit core server as light pulses reflect in her eyes';
    node1.artifacts.textContent = 'Everything we thought we knew about processing speed just changed.';

    await ProjectService.saveProject(project);
    console.log(`✓ Bound anchors to Node ${node1.id}: [${node1.boundSubjectAnchorIds.join(', ')}]`);
    console.log(`✓ Overrides set: Lens=${node1.shotContextOverrides.lensFocalLength}, Aperture=${node1.shotContextOverrides.aperture}, Move=${node1.shotContextOverrides.cameraMovement}`);

    // 4. Run Rich Prompt Synthesizer
    console.log('\n[4/5] Executing skill-prompt-synthesizer with Cascading Style & Two-Layer Negative Guards...');
    const synthesisResult: any = await SkillRegistry.execute(
      'skill-prompt-synthesizer',
      {
        targetPlatform: 'runway',
        shotConcept: node1.prompt,
        aspectRatio: project.aspectRatio,
        durationSec: project.scenes[0].targetDurationSec, // 3s
        fps: project.fps, // 30
        shotType: 'medium_shot',
        lensFocalLength: node1.shotContextOverrides.lensFocalLength,
        aperture: node1.shotContextOverrides.aperture,
        cameraMovement: node1.shotContextOverrides.cameraMovement,
        motionSpeed: node1.shotContextOverrides.motionSpeed,
        continuityContext: node1.shotContextOverrides.continuityNotes,
        spokenVoiceover: node1.artifacts.textContent,
        subjectAnchors: [
          {
            id: presenterAnchor.id,
            name: presenterAnchor.name,
            coreDescription: presenterAnchor.coreDescription,
            variantLabel: presenterAnchor.variants[0].label,
            variantDescription: presenterAnchor.variants[0].promptDescription,
            mediaUrl: presenterAnchor.variants[0].mediaUrl,
          },
          {
            id: productAnchor.id,
            name: productAnchor.name,
            coreDescription: productAnchor.coreDescription,
            variantLabel: productAnchor.variants[0].label,
            variantDescription: productAnchor.variants[0].promptDescription,
            mediaUrl: productAnchor.variants[0].mediaUrl,
          },
        ],
      },
      {
        projectRoot: testDir,
        styleGuideMd: project.styleMarkdown,
        styleTokensJson: project.styleTokens,
      }
    );

    // 5. Verify Outputs Across Platforms
    console.log('\n[5/5] Verifying Platform Synthesizer Outputs...');

    // Runway verification
    console.log('\n--- [RUNWAY GEN-3 SYNTHESIS] ---');
    console.log(synthesisResult.allPlatformPrompts['runway'].fullString);
    if (!synthesisResult.allPlatformPrompts['runway'].fullString.includes('camera: push in slowly')) {
      throw new Error('Runway prompt missing camera tag');
    }
    if (!synthesisResult.allPlatformPrompts['runway'].fullString.includes('duration: 5s')) {
      throw new Error('Runway prompt missing duration flag');
    }

    // Kling verification (Two-Layer Negative Guards)
    console.log('\n--- [KLING 1.5 PRO SYNTHESIS] ---');
    const kling = synthesisResult.allPlatformPrompts['kling'];
    console.log(kling.fullString);
    if (!kling.negativePrompt.includes('morphing anatomy')) {
      throw new Error('Kling missing Layer 2 artifact negative guard');
    }
    if (!kling.negativePrompt.includes('glossy modern 3d')) {
      throw new Error('Kling missing Layer 1 editorial_grain negative guard');
    }

    // Minimax verification (Descriptive narrative)
    console.log('\n--- [MINIMAX DESCRIPTIVE NARRATIVE] ---');
    const minimax = synthesisResult.allPlatformPrompts['minimax'];
    console.log(minimax.prompt);
    if (!minimax.prompt.includes('A high-end cinematic take')) {
      throw new Error('Minimax missing narrative lead');
    }

    // ComfyUI verification (Exact frames calculation)
    console.log('\n--- [LOCAL COMFYUI SETTINGS] ---');
    const comfy = synthesisResult.allPlatformPrompts['comfyui'];
    console.log(comfy.fullString);
    if (comfy.parameters.frames !== 90) { // 3s * 30fps = 90 frames
      throw new Error(`Expected 90 frames for 3s scene, got ${comfy.parameters.frames}`);
    }

    // Reference asset preservation in output
    if (!synthesisResult.referenceImageUrls.includes('assets/subjects/subj_anya_lead/var_formal_01.png')) {
      throw new Error('Missing active variant image URL in output');
    }

    console.log('\n✅ ALL 5 VERIFICATION CHECKS PASSED WITH 100% ACCURACY!');
  } finally {
    await fs.rm(testDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
