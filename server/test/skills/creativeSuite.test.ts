import { describe, it, expect } from 'vitest';
import {
  CREATIVE_SKILLS_CATALOG,
  enrichPromptWithCreativeSkills,
  generateEarshotAudioCues,
  generateCookMontageRecipe,
} from '../../src/skills/external/creativeSuite.js';

describe('Creative Suite External Skills Integration', () => {
  it('registers all 9 external creative skills with repos and authors', () => {
    const skillKeys = Object.keys(CREATIVE_SKILLS_CATALOG);
    expect(skillKeys).toContain('huashu-motion');
    expect(skillKeys).toContain('rossark-motion');
    expect(skillKeys).toContain('take-one');
    expect(skillKeys).toContain('reanimate');
    expect(skillKeys).toContain('argo');
    expect(skillKeys).toContain('explainroo');
    expect(skillKeys).toContain('video-director');
    expect(skillKeys).toContain('earshot');
    expect(skillKeys).toContain('cook');
    expect(skillKeys.length).toBe(9);
  });

  it('enriches prompts using Video Director & Take-One directives for shots', () => {
    const base = 'Cyberpunk hacker standing under neon billboard in rain';
    const result = enrichPromptWithCreativeSkills(base, 'shot', ['video-director', 'take-one']);

    expect(result.enrichedPrompt).toContain('Cyberpunk hacker');
    expect(result.enrichedPrompt).toContain('ARRI Alexa 65');
    expect(result.enrichedPrompt).toContain('facial geometry locked');
    expect(result.appliedSkills.length).toBe(2);
    expect(result.skillDirectives.length).toBeGreaterThan(4);
  });

  it('enriches motion prompts using Rossark Motion natural physics directives', () => {
    const base = 'Camera sweeping around 3D phone screen';
    const result = enrichPromptWithCreativeSkills(base, 'motion', ['rossark-motion']);

    expect(result.enrichedPrompt).toContain('smooth 60fps organic motion');
    expect(result.enrichedPrompt).toContain('subtle weight-shifting inertia');
  });

  it('generates Earshot foley audio cues and sound design stems', () => {
    const cues = generateEarshotAudioCues('Action sequence with tactile interface interaction');
    expect(cues.length).toBeGreaterThanOrEqual(3);
    expect(cues[0].type).toBe('ambience');
    expect(cues[1].type).toBe('stinger');
  });

  it('generates Cook montage pacing recipe aligned to tempo BPM grid', () => {
    const recipe = generateCookMontageRecipe('Cyberpunk Pitch', 16, 120);
    expect(recipe.bpm).toBe(120);
    expect(recipe.cuts.length).toBeGreaterThanOrEqual(4);
    const sumDuration = recipe.cuts.reduce((acc, c) => acc + c.durationSec, 0);
    expect(Math.abs(sumDuration - 16)).toBeLessThanOrEqual(0.1);
  });
});
