import { AgentPresence } from '../protocol/aguiEvents.js';

export class AgentManager {
  private static agents = new Map<string, AgentPresence>([
    [
      'agy-director',
      {
        agentId: 'agy-director',
        name: 'Antigravity Director',
        modelEngine: 'antigravity-cli',
        color: '#38BDF8', // Cyan / Light Blue
        activeNodeId: null,
        targetTimelineBlockId: null,
        status: 'idle',
        activityMessage: 'Ready for creative direction & script doctoring with Antigravity',
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
      'video-director',
      {
        agentId: 'video-director',
        name: 'Video Director (win4r)',
        modelEngine: 'external',
        color: '#EAB308', // Amber Gold
        activeNodeId: null,
        targetTimelineBlockId: null,
        status: 'idle',
        activityMessage: 'Anamorphic lens optics, volumetric lighting, and camera blocking active',
        updatedAt: Date.now(),
      },
    ],
    [
      'take-one',
      {
        agentId: 'take-one',
        name: 'Take-One Director (talsiach)',
        modelEngine: 'external',
        color: '#EC4899', // Pink
        activeNodeId: null,
        targetTimelineBlockId: null,
        status: 'idle',
        activityMessage: 'Actor facial consistency and multi-take coverage matrix locked',
        updatedAt: Date.now(),
      },
    ],
    [
      'huashu-motion',
      {
        agentId: 'huashu-motion',
        name: 'Huashu Motion (alchaincyf)',
        modelEngine: 'external',
        color: '#06B6D4', // Cyan
        activeNodeId: null,
        targetTimelineBlockId: null,
        status: 'idle',
        activityMessage: 'Kinetic typography and Remotion frame sync ready',
        updatedAt: Date.now(),
      },
    ],
    [
      'rossark-motion',
      {
        agentId: 'rossark-motion',
        name: 'Rossark Motion (rossark0)',
        modelEngine: 'external',
        color: '#8B5CF6', // Purple
        activeNodeId: null,
        targetTimelineBlockId: null,
        status: 'idle',
        activityMessage: 'Natural 60fps physics, weight shifts, and easing curves calibrated',
        updatedAt: Date.now(),
      },
    ],
    [
      'earshot-sound',
      {
        agentId: 'earshot-sound',
        name: 'Earshot Sound Designer (Leonxlnx)',
        modelEngine: 'external',
        color: '#10B981', // Emerald
        activeNodeId: null,
        targetTimelineBlockId: null,
        status: 'idle',
        activityMessage: 'Foley sound cues and acoustic scene analysis ready',
        updatedAt: Date.now(),
      },
    ],
    [
      'cook-editor',
      {
        agentId: 'cook-editor',
        name: 'Cook Editorial Chef (Leonxlnx)',
        modelEngine: 'external',
        color: '#F43F5E', // Rose
        activeNodeId: null,
        targetTimelineBlockId: null,
        status: 'idle',
        activityMessage: 'Rhythm cuts, speed ramps, and montage recipe assembly active',
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
