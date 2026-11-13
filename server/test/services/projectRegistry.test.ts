import { describe, it, expect, beforeEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ProjectRegistry, GlobalStylePreset } from '../../src/services/projectRegistry.js';
import { ProjectService } from '../../src/services/projectService.js';

describe('ProjectRegistry & Cascading Style System', () => {
  const testStudioHome = path.join(process.cwd(), '.tmp-test-studio');

  beforeEach(async () => {
    process.env.STUDIO_HOME = testStudioHome;
    await fs.rm(testStudioHome, { recursive: true, force: true });
    await ProjectRegistry.initialize();
  });

  it('initializes default style presets correctly', async () => {
    const presets = await ProjectRegistry.listStylePresets();
    expect(presets.length).toBeGreaterThanOrEqual(4);
    const ids = presets.map((p) => p.id);
    expect(ids).toContain('liquid_glass');
    expect(ids).toContain('kinetic_type');
    expect(ids).toContain('editorial_grain');
    expect(ids).toContain('pop_bold');
  });

  it('cascades global style presets with local overrides and additional negative constraints', async () => {
    const basePreset = await ProjectRegistry.getStylePreset('liquid_glass');
    expect(basePreset).toBeDefined();

    // Custom project override: override accent color to flaming orange, faster cut cadence
    const localOverrides = {
      palette: {
        accent: '#FF4500',
      },
      pacing: {
        avgCutDurationSec: 1.1,
      },
    };

    const additionalConstraints = [
      'No competitor logos (Acme Corp)',
      'Keep logo watermark in top right',
    ];

    const resolved = ProjectRegistry.resolveCompositeStyle(
      basePreset,
      localOverrides,
      additionalConstraints
    );

    // Verify overridden properties
    expect(resolved.tokens.palette.accent).toBe('#FF4500');
    expect(resolved.tokens.pacing.avgCutDurationSec).toBe(1.1);

    // Verify inherited properties
    expect(resolved.tokens.palette.background).toBe('#0B0F19');
    expect(resolved.tokens.typography.displayFont).toBe('Inter-700');

    // Verify additional negative constraints merged
    expect(resolved.tokens.negativeConstraints).toContain('No competitor logos (Acme Corp)');
    expect(resolved.tokens.negativeConstraints).toContain('Keep logo watermark in top right');
    expect(resolved.markdown).toContain('#FF4500');
    expect(resolved.markdown).toContain('No competitor logos (Acme Corp)');
  });

  it('registers projects in recent list and sorts by lastOpenedAt descending', async () => {
    const testProjDir1 = path.join(testStudioHome, 'proj_alpha');
    const testProjDir2 = path.join(testStudioHome, 'proj_beta');

    const proj1 = await ProjectService.initProject(testProjDir1, 'Project Alpha', {
      preset: 'reel_9_16',
      initGit: false,
    });
    const proj2 = await ProjectService.initProject(testProjDir2, 'Project Beta', {
      preset: 'youtube_16_9',
      initGit: false,
    });

    const recents = await ProjectRegistry.listRecentProjects();
    expect(recents.length).toBe(2);
    expect(recents[0].name).toBe('Project Beta'); // Most recent first
    expect(recents[1].name).toBe('Project Alpha');
    expect(recents[0].aspectRatio).toBe('16:9');
    expect(recents[1].aspectRatio).toBe('9:16');
  });

  it('removes project from recent index without deleting files by default', async () => {
    const testProjDir = path.join(testStudioHome, 'proj_gamma');
    const proj = await ProjectService.initProject(testProjDir, 'Project Gamma', { initGit: false });

    let recents = await ProjectRegistry.listRecentProjects();
    expect(recents.some((p) => p.id === proj.id)).toBe(true);

    const removed = await ProjectRegistry.removeProject(proj.id, false);
    expect(removed).toBe(true);

    recents = await ProjectRegistry.listRecentProjects();
    expect(recents.some((p) => p.id === proj.id)).toBe(false);

    // Files on disk should still exist
    const stat = await fs.stat(testProjDir);
    expect(stat.isDirectory()).toBe(true);
  });

  it('saves new global style preset and allows retrieving it', async () => {
    const newPreset: GlobalStylePreset = {
      id: 'cyber_neon',
      name: 'Cyber Neon 2077',
      description: 'Futuristic high-contrast neon grid aesthetic.',
      archetype: 'liquid_glass',
      tokens: {
        palette: {
          background: '#050505',
          card: '#121212',
          accent: '#00FF66',
          text: '#FFFFFF',
        },
        typography: {
          displayFont: 'Orbitron-900',
          bodyFont: 'Inter-400',
          headingCase: 'uppercase',
        },
        pacing: {
          avgCutDurationSec: 1.3,
          rhythm: 'fast_snappy',
          usefulPauses: false,
        },
        motion: {
          easingCurve: 'power4.out',
          overshoot: true,
          primaryMoves: ['pop', 'slide-in'],
        },
        audioRules: {
          targetLufs: -14,
          musicDuckingDb: 15,
          sfxSignature: ['synth_blip'],
        },
        negativeConstraints: ['No muted earth tones'],
      },
      styleDocMarkdown: '# Cyber Neon',
      updatedAt: Date.now(),
    };

    await ProjectRegistry.saveStylePreset(newPreset);

    const fetched = await ProjectRegistry.getStylePreset('cyber_neon');
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('Cyber Neon 2077');
    expect(fetched?.tokens.palette.accent).toBe('#00FF66');
  });
});
