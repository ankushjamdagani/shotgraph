import path from 'node:path';
import fs from 'node:fs/promises';
import { ProjectRegistry } from '../server/src/services/projectRegistry.js';
import { ProjectService } from '../server/src/services/projectService.js';
import { SkillRegistry, initializeSkills } from '../server/src/skills/index.js';

async function verifyMultiProjectSystem() {
  console.log('========================================================');
  console.log('  Shotgraph — Multi-Project System Verify  ');
  console.log('========================================================\n');

  const testRoot = path.join(process.cwd(), '.tmp-multi-project-verify');
  process.env.STUDIO_HOME = path.join(testRoot, '.studio-home');

  // Clean test scratchpad
  await fs.rm(testRoot, { recursive: true, force: true });
  await fs.mkdir(testRoot, { recursive: true });

  initializeSkills();
  await ProjectRegistry.initialize();

  // 1. Create Project A (9:16 Reel)
  console.log('[1/5] Initializing Project A in arbitrary directory...');
  const dirA = path.join(testRoot, 'projects', 'client_alpha_reel');
  const projA = await ProjectService.initProject(dirA, 'Client Alpha Viral Reel', {
    preset: 'reel_9_16',
    basePresetId: 'liquid_glass',
    initGit: false,
  });
  console.log(`  ✓ Project A created: "${projA.name}" (ID: ${projA.id})`);
  console.log(`  ✓ Format: ${projA.aspectRatio}, Duration: ${projA.targetDurationSec}s`);
  console.log(`  ✓ Location: ${projA.projectRoot}`);

  // 2. Create Project B (16:9 YouTube Explainer)
  console.log('\n[2/5] Initializing Project B in separate directory...');
  const dirB = path.join(testRoot, 'projects', 'client_beta_youtube');
  const projB = await ProjectService.initProject(dirB, 'Client Beta YouTube Deep Dive', {
    preset: 'youtube_16_9',
    basePresetId: 'editorial_grain',
    initGit: false,
  });
  console.log(`  ✓ Project B created: "${projB.name}" (ID: ${projB.id})`);
  console.log(`  ✓ Format: ${projB.aspectRatio}, Duration: ${projB.targetDurationSec}s`);
  console.log(`  ✓ Location: ${projB.projectRoot}`);

  // 3. Verify Central Registry
  console.log('\n[3/5] Verifying Central Project Registry tracking...');
  const recents = await ProjectRegistry.listRecentProjects();
  console.log(`  ✓ Total registered projects: ${recents.length}`);
  if (recents.length < 2) {
    throw new Error('Expected at least 2 projects in central registry');
  }
  const foundA = recents.find((p) => p.id === projA.id);
  const foundB = recents.find((p) => p.id === projB.id);
  if (!foundA || !foundB) {
    throw new Error('Failed to find both projects in recent index');
  }
  console.log(`  ✓ Project A in registry: ${foundA.name} (${foundA.aspectRatio})`);
  console.log(`  ✓ Project B in registry: ${foundB.name} (${foundB.aspectRatio})`);

  // 4. Verify DAG Isolation between Projects
  console.log('\n[4/5] Verifying DAG Version Tree isolation...');
  const firstNodeA = Object.keys(projA.nodes)[0];
  const branchA = await ProjectService.branchVersionNode(
    projA,
    firstNodeA,
    'v2.0 (Alpha Hook Test)',
    'Generate bold kinetic hook for Alpha',
    'antigravity-cli'
  );
  console.log(`  ✓ Branched node in Project A: "${branchA.id}"`);

  // Verify Project B's state doesn't have Project A's node
  const reloadedB = await ProjectService.loadProject(dirB);
  if (reloadedB.nodes[branchA.id]) {
    throw new Error('Project B contains Project A node! State collision detected.');
  }
  console.log('  ✓ State isolation verified: Project B contains zero Project A nodes.');

  // 5. Verify Cascading Style System with Local Overrides & Extra Constraints
  console.log('\n[5/5] Testing Cascading Style System with Local Overrides...');
  const basePreset = await ProjectRegistry.getStylePreset('liquid_glass');
  const customOverrides = {
    palette: { accent: '#FF0055' },
    typography: { displayFont: 'ArchivoBlack-400' },
  };
  const extraNegativeRules = [
    'No competitor logos (MegaCorp)',
    'No flashing strobes over 3Hz',
  ];

  const resolved = ProjectRegistry.resolveCompositeStyle(
    basePreset,
    customOverrides,
    extraNegativeRules
  );

  // Apply to Project A
  projA.styleOverrides = customOverrides;
  projA.additionalConstraints = extraNegativeRules;
  projA.styleMarkdown = resolved.markdown;
  projA.styleTokens = resolved.tokens;
  await ProjectService.saveProject(projA);

  const reloadedProjA = await ProjectService.loadProject(dirA);
  const reloadedProjB = await ProjectService.loadProject(dirB);

  if (!reloadedProjA.styleMarkdown.includes('#FF0055')) {
    throw new Error('Project A failed to save local accent override');
  }
  if (!reloadedProjA.styleMarkdown.includes('No competitor logos (MegaCorp)')) {
    throw new Error('Project A failed to save additional negative constraints');
  }
  if (reloadedProjB.styleMarkdown.includes('#FF0055')) {
    throw new Error('Project B was polluted by Project A style overrides!');
  }

  console.log('  ✓ Project A local override (#FF0055) compiled and persisted in STYLE.md');
  console.log('  ✓ Project A additional constraint ("No competitor logos") persisted');
  console.log('  ✓ Project B preserved its independent editorial style guide');

  // Clean up test scratchpad
  await fs.rm(testRoot, { recursive: true, force: true });

  console.log('\n========================================================');
  console.log('  Status: MULTI-PROJECT SYSTEM VERIFIED 100% HEALTHY!   ');
  console.log('========================================================\n');
}

verifyMultiProjectSystem().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
