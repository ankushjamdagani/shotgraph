export type ModelEngine = 'antigravity-cli' | 'claude-cli' | 'ollama' | 'hyperframes' | 'external';

export interface SubjectVariant {
  id: string;
  label: string; // e.g. "Formal Charcoal Blazer (Default)", "Casual Black Tee"
  promptDescription: string;
  mediaUrl?: string; // e.g. "assets/subjects/anya/var_01.png"
  isDefault: boolean;
  createdAt: number;
}

export interface ProjectSubjectAnchor {
  id: string;
  name: string; // e.g. "Anya - Lead Presenter"
  category: 'character' | 'product' | 'environment' | 'prop';
  coreDescription: string; // Base physical traits, face, hair, materials
  variants: SubjectVariant[];
  activeVariantId: string;
  createdAt: number;
}

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
  boundSubjectAnchorIds?: string[];
  shotContextOverrides?: {
    lensFocalLength?: string;
    aperture?: string;
    cameraMovement?: string;
    motionSpeed?: 'slow_cinematic' | 'normal' | 'high_energy' | 'time_lapse';
    continuityNotes?: string;
  };
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
  subjectAnchors?: ProjectSubjectAnchor[];
  basePresetId?: string;
  styleOverrides?: Record<string, any>;
  additionalConstraints?: string[];
  styleMarkdown: string;
  styleTokens: Record<string, any>;
}

export interface ProjectRegistryEntry {
  id: string;
  name: string;
  path: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  fps: number;
  targetDurationSec: number;
  lastOpenedAt: number;
  createdAt: number;
  previewThumbnailUrl?: string;
  basePresetId?: string;
  styleOverrides?: Record<string, any>;
  additionalConstraints?: string[];
}

export interface GlobalStylePreset {
  id: string;
  name: string;
  description: string;
  archetype: 'liquid_glass' | 'kinetic_type' | 'editorial_grain' | 'pop_bold';
  tokens: {
    palette: {
      background: string;
      card: string;
      accent: string;
      text: string;
    };
    typography: {
      displayFont: string;
      bodyFont: string;
      headingCase: 'uppercase' | 'sentence_case' | 'mixed';
    };
    pacing: {
      avgCutDurationSec: number;
      rhythm: 'fast_snappy' | 'conversational' | 'cinematic_unhurried';
      usefulPauses: boolean;
    };
    motion: {
      easingCurve: string;
      overshoot: boolean;
      primaryMoves: string[];
    };
    audioRules: {
      targetLufs: number;
      musicDuckingDb: number;
      sfxSignature: string[];
    };
    negativeConstraints: string[];
  };
  styleDocMarkdown: string;
  updatedAt: number;
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
