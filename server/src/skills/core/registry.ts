import { SkillDefinition, SkillExecutionContext } from './types.js';

export class SkillRegistry {
  private static skills = new Map<string, SkillDefinition<any, any>>();

  static register(skill: SkillDefinition<any, any>) {
    this.skills.set(skill.id, skill);
  }

  static get(skillId: string): SkillDefinition<any, any> | undefined {
    return this.skills.get(skillId);
  }

  static list(): SkillDefinition<any, any>[] {
    return Array.from(this.skills.values());
  }

  static async execute<TInput, TOutput>(
    skillId: string,
    input: TInput,
    context: SkillExecutionContext
  ): Promise<TOutput> {
    const skill = this.get(skillId);
    if (!skill) {
      throw new Error(`Skill with ID "${skillId}" not found in registry.`);
    }

    // Validate Input Schema
    const validatedInput = skill.inputSchema.parse(input);

    context.onLog?.(`[Skill: ${skill.name}] Starting execution...`);
    const output = await skill.execute(validatedInput, context);

    // Validate Output Schema
    const validatedOutput = skill.outputSchema.parse(output);
    context.onLog?.(`[Skill: ${skill.name}] Completed successfully.`);

    return validatedOutput;
  }
}
