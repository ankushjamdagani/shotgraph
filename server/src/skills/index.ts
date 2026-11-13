import { SkillRegistry } from './core/registry.js';
import { skillTasteAnalyzer } from './taste/skillTasteAnalyzer.js';
import { skillTasteMixer } from './taste/skillTasteMixer.js';
import { skillHookGenerator } from './ideation/skillHookGenerator.js';
import { skillBeatScriptwriter } from './script/skillBeatScriptwriter.js';
import { skillPromptSynthesizer } from './prompt/skillPromptSynthesizer.js';
import { skillAssetGenerator } from './asset/skillAssetGenerator.js';
import { skillFCPXMLBuilder } from './export/skillFCPXMLBuilder.js';

export function initializeSkills() {
  SkillRegistry.register(skillTasteAnalyzer);
  SkillRegistry.register(skillTasteMixer);
  SkillRegistry.register(skillHookGenerator);
  SkillRegistry.register(skillBeatScriptwriter);
  SkillRegistry.register(skillPromptSynthesizer);
  SkillRegistry.register(skillAssetGenerator);
  SkillRegistry.register(skillFCPXMLBuilder);
}

export { SkillRegistry };
export * from './core/types.js';
export * from './taste/skillTasteAnalyzer.js';
export * from './taste/skillTasteMixer.js';
export * from './ideation/skillHookGenerator.js';
export * from './script/skillBeatScriptwriter.js';
export * from './prompt/skillPromptSynthesizer.js';
export * from './asset/skillAssetGenerator.js';
export * from './export/skillFCPXMLBuilder.js';
export * from './external/creativeSuite.js';
