import { AgentPresence } from '../protocol/aguiEvents.js';

export class AgentManager {
  private static agents = new Map<string, AgentPresence>([
    [
      'gemini-director',
      {
        agentId: 'gemini-director',
        name: 'Gemini Director',
        modelEngine: 'gemini-cli',
        color: '#38BDF8', // Cyan / Light Blue
        activeNodeId: null,
        targetTimelineBlockId: null,
        status: 'idle',
        activityMessage: 'Ready for creative direction & script doctoring',
        updatedAt: Date.now(),
      },
    ],
    [
      'claude-motion',
      {
        agentId: 'claude-motion',
        name: 'Claude Motion',
        modelEngine: 'claude-cli',
        color: '#A855F7', // Purple
        activeNodeId: null,
        targetTimelineBlockId: null,
        status: 'idle',
        activityMessage: 'Ready for HyperFrames & GSAP code generation',
        updatedAt: Date.now(),
      },
    ],
    [
      'ollama-local',
      {
        agentId: 'ollama-local',
        name: 'Ollama Copywriter',
        modelEngine: 'ollama',
        color: '#22C55E', // Emerald Green
        activeNodeId: null,
        targetTimelineBlockId: null,
        status: 'idle',
        activityMessage: 'Local offline language model ready',
        updatedAt: Date.now(),
      },
    ],
    [
      'hyperframes-worker',
      {
        agentId: 'hyperframes-worker',
        name: 'HyperFrames Engine',
        modelEngine: 'hyperframes',
        color: '#F97316', // Orange
        activeNodeId: null,
        targetTimelineBlockId: null,
        status: 'idle',
        activityMessage: 'Ready for rendering, Kokoro TTS, and transcription',
        updatedAt: Date.now(),
      },
    ],
  ]);

  static listPresences(): AgentPresence[] {
    return Array.from(this.agents.values());
  }

  static getPresence(agentId: string): AgentPresence | undefined {
    return this.agents.get(agentId);
  }

  static updatePresence(
    agentId: string,
    updates: Partial<Omit<AgentPresence, 'agentId'>>
  ): AgentPresence {
    const current = this.agents.get(agentId);
    if (!current) {
      throw new Error(`Agent with ID "${agentId}" not found in swarm.`);
    }

    const updated: AgentPresence = {
      ...current,
      ...updates,
      updatedAt: Date.now(),
    };

    this.agents.set(agentId, updated);
    return updated;
  }
}
