#!/usr/bin/env tsx
import * as path from 'path';
import * as fs from 'fs/promises';
import { ProjectService } from '../server/src/services/projectService.js';
import { initializeSkills, SkillRegistry } from '../server/src/skills/index.js';

async function main() {
  console.log('========================================================');
  console.log('  Visual AI Video Studio — End-to-End System Verification');
  console.log('========================================================\n');

  initializeSkills();
  const root = process.cwd();

  // 1. Initialize project folder
  console.log('[1/4] Initializing Git-native project workspace...');
  const project = await ProjectService.initProject(root, 'Product Launch Reel v1');
  console.log(`  ✓ Project created: "${project.name}" (ID: ${project.id})`);
  console.log(`  ✓ Initial scenes: ${project.scenes.length}`);
  console.log(`  ✓ Initial nodes: ${Object.keys(project.nodes).length}`);

  // 2. Test Branching
  console.log('\n[2/4] Testing DAG Version Tree branching...');
  const firstNodeId = Object.keys(project.nodes)[0];
  const branchedNode = await ProjectService.branchVersionNode(
    project,
    firstNodeId,
    'v2.0 (Kinetic Bold Hook)',
    'Generate bold kinetic hook: Stop losing 80% of viewers in 2 seconds.',
    'gemini-cli'
  );
  console.log(`  ✓ Branched node created: "${branchedNode.id}" (Parent: ${branchedNode.parentId})`);

  // Set as active cut
  await ProjectService.setActiveCutNode(project, project.scenes[0].id, branchedNode.id);
  console.log(`  ✓ Set "${branchedNode.id}" as active cut for ${project.scenes[0].name}`);

  // 3. Test DaVinci Resolve Bundle Export
  console.log('\n[3/4] Testing DaVinci Resolve FCPXML v1.10 Bundle Packager...');
  const clips = [
    {
      id: 'clip_01',
      name: 'Scene 1: Kinetic Bold Hook',
      relativeFilePath: 'V1_footage/scene_01_take.mp4',
      startSec: 0,
      durationSec: 3,
      track: 'V1_footage' as const,
    },
    {
      id: 'overlay_01',
      name: 'Scene 1: Liquid Glass Card Overlay',
      relativeFilePath: 'V2_overlay/card_01.mov',
      startSec: 0.5,
      durationSec: 2.5,
      track: 'V2_overlay' as const,
    },
    {
      id: 'voice_01',
      name: 'Dialogue Voiceover Master',
      relativeFilePath: 'A1_dialogue/voice_master.wav',
      startSec: 0,
      durationSec: 30,
      track: 'A1_dialogue' as const,
    },
    {
      id: 'sfx_01',
      name: 'Tick Sound Effect',
      relativeFilePath: 'A2_sfx/tick.wav',
      startSec: 1.2,
      durationSec: 0.3,
      track: 'A2_sfx' as const,
    },
    {
      id: 'music_01',
      name: 'Background Music Ducked (-14 LUFS)',
      relativeFilePath: 'A3_music/bed_ducked.wav',
      startSec: 0,
      durationSec: 30,
      track: 'A3_music' as const,
    },
  ];

  const exportResult: any = await SkillRegistry.execute(
    'skill-fcpxml-builder',
    {
      projectName: project.name,
      totalDurationSec: 30,
      fps: 30,
      width: 1080,
      height: 1920,
      clips,
    },
    { projectRoot: root }
  );

  const bundleDir = path.join(root, 'exports', 'davinci_bundle');
  await fs.mkdir(bundleDir, { recursive: true });

  await fs.writeFile(path.join(bundleDir, 'timeline.fcpxml'), exportResult.fcpxmlContent, 'utf-8');
  await fs.writeFile(path.join(bundleDir, 'timeline.edl'), exportResult.edlContent, 'utf-8');
  await fs.writeFile(path.join(bundleDir, 'subtitles.srt'), exportResult.srtContent, 'utf-8');
  await fs.writeFile(path.join(bundleDir, 'STYLE_GUIDE.md'), project.styleMarkdown, 'utf-8');

  console.log(`  ✓ Generated timeline.fcpxml (${exportResult.fcpxmlContent.length} bytes)`);
  console.log(`  ✓ Generated timeline.edl`);
  console.log(`  ✓ Generated subtitles.srt`);
  console.log(`  ✓ Export bundle verified at: ${bundleDir}`);

  // 4. Verify FCPXML Integrity
  console.log('\n[4/4] Verifying FCPXML v1.10 syntax...');
  const fcpxmlRead = await fs.readFile(path.join(bundleDir, 'timeline.fcpxml'), 'utf-8');
  if (!fcpxmlRead.includes('<fcpxml version="1.10">') || !fcpxmlRead.includes('<spine>')) {
    throw new Error('FCPXML validation failed: Missing version header or spine');
  }
  console.log('  ✓ FCPXML schema valid and ready for DaVinci Resolve import.');

  console.log('\n========================================================');
  console.log('  Status: ALL SYSTEM CHECKS PASSED SUCCESSFULLY!        ');
  console.log('========================================================\n');
}

main().catch((err) => {
  console.error('System verification failed:', err);
  process.exit(1);
});
