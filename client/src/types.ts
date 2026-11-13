export type ModelEngine = 'antigravity-cli' | 'claude-cli' | 'ollama' | 'hyperframes' | 'external';

export interface VersionNode {
  id: string;
  parentId: string | null;
  sceneId: string;
  versionLabel: string;
  stage: 'ideation' | 'taste' | 'script' | 'storyboard' | 'voice' | 'motion' | 'render';
  title: string;
  modelEngine: ModelEngine;
  modelName?: string;
  prompt: string;
  externalFallback?: {
    platform: string;
    synthesizedPrompt: string;
    status: 'prompt_copied' | 'asset_imported';
  };
  artifacts: {
    textContent?: string;
    mediaUrl?: string;
    alphaOverlayUrl?: string;
    wordTimingsJson?: string;
    scriptBeats?: any[];
  };
  metadata: {
    createdAt: string;
    status: 'idle' | 'generating' | 'ready' | 'error';
    errorLog?: string;
  };
}

export interface FilmProject {
  id: string;
  name: string;
  projectRoot: string;
  targetDurationSec: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  fps: number;
  scenes: Array<{
    id: string;
    name: string;
    order: number;
    targetDurationSec: number;
  }>;
  activeCut: Record<string, string>; // sceneId -> versionNodeId
  nodes: Record<string, VersionNode>;
  styleMarkdown: string;
  styleTokens: Record<string, any>;
}

export interface AgentPresence {
  agentId: string;
  name: string;
  modelEngine: ModelEngine;
  color: string;
  activeNodeId: string | null;
  status: 'idle' | 'thinking' | 'generating' | 'rendering' | 'error';
  activityMessage: string;
  updatedAt: number;
}
