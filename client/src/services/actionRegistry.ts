import { apiFetch } from './api';
import { FilmProject } from '../types.js';
import { toast } from './toastService.js';

export interface ActionContext {
  project: FilmProject | null;
  onUpdateProject: (updated: FilmProject) => void;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onOpenProjectSettings?: () => void;
  onOpenDaVinciExport?: () => void;
  onOpenSubjectManager?: () => void;
  onOpenTasteMixer?: () => void;
  fitView?: () => void;
  zoomIn?: () => void;
  zoomOut?: () => void;
}

export interface StudioAction {
  id: string;
  title: string;
  description: string;
  category: 'canvas' | 'nodes' | 'timeline' | 'project' | 'audio' | 'tools';
  shortcut?: string;
  keywords?: string[];
  parametersSchema?: Record<string, any>;
  execute: (context: ActionContext, params?: any) => Promise<any> | any;
}

class ActionRegistry {
  private actions: Map<string, StudioAction> = new Map();

  register(action: StudioAction) {
    this.actions.set(action.id, action);
  }

  get(id: string): StudioAction | undefined {
    return this.actions.get(id);
  }

  list(): StudioAction[] {
    return Array.from(this.actions.values());
  }

  listByCategory(category: StudioAction['category']): StudioAction[] {
    return this.list().filter((a) => a.category === category);
  }

  async execute(id: string, context: ActionContext, params?: any): Promise<any> {
    const action = this.get(id);
    if (!action) {
      console.warn(`[StudioActionRegistry]: Action "${id}" not found.`);
      toast.error(`Action "${id}" is not registered`);
      return null;
    }
    try {
      return await action.execute(context, params);
    } catch (err: any) {
      console.error(`[StudioActionRegistry]: Error executing action "${id}":`, err);
      toast.error(err.message || `Failed to execute action "${action.title}"`);
      throw err;
    }
  }
}

export const studioActionRegistry = new ActionRegistry();

// =========================================================================
// Core Studio Actions Registration
// =========================================================================

// 1. Project Level Actions
studioActionRegistry.register({
  id: 'project.settings',
  title: 'Project Settings',
  description: 'Edit aspect ratio, duration, typography, and taste profile',
  category: 'project',
  shortcut: 'Cmd+,',
  keywords: ['aspect', 'duration', 'font', 'settings', 'fps'],
  execute: (ctx) => {
    if (ctx.onOpenProjectSettings) {
      ctx.onOpenProjectSettings();
    } else {
      toast.info('Project settings not configured');
    }
  },
});

studioActionRegistry.register({
  id: 'project.davinci_export',
  title: 'Export DaVinci Resolve Bundle',
  description: 'Generate timeline FCPXML and organize raw assets for DaVinci Resolve',
  category: 'project',
  shortcut: 'Cmd+E',
  keywords: ['export', 'fcpxml', 'davinci', 'timeline'],
  execute: (ctx) => {
    if (ctx.onOpenDaVinciExport) ctx.onOpenDaVinciExport();
  },
});

studioActionRegistry.register({
  id: 'project.subjects',
  title: 'Manage Subject Consistency Anchors',
  description: 'Configure character turnarounds, faces, and product style anchors',
  category: 'project',
  keywords: ['character', 'subject', 'turnaround', 'consistency'],
  execute: (ctx) => {
    if (ctx.onOpenSubjectManager) ctx.onOpenSubjectManager();
  },
});

// 2. Canvas & Navigation Actions
studioActionRegistry.register({
  id: 'canvas.zoom_fit',
  title: 'Fit Canvas to Screen',
  description: 'Recenter and fit all DAG nodes in view',
  category: 'canvas',
  shortcut: 'Shift+1',
  keywords: ['zoom', 'fit', 'center', 'recenter'],
  execute: (ctx) => {
    if (ctx.fitView) {
      ctx.fitView();
      toast.info('Canvas view fitted to screen');
    }
  },
});

studioActionRegistry.register({
  id: 'canvas.zoom_in',
  title: 'Zoom In',
  description: 'Zoom closer into canvas nodes',
  category: 'canvas',
  shortcut: 'Cmd+=',
  execute: (ctx) => {
    if (ctx.zoomIn) ctx.zoomIn();
  },
});

studioActionRegistry.register({
  id: 'canvas.zoom_out',
  title: 'Zoom Out',
  description: 'Zoom farther out on canvas',
  category: 'canvas',
  shortcut: 'Cmd+-',
  execute: (ctx) => {
    if (ctx.zoomOut) ctx.zoomOut();
  },
});

// 3. Audio & Voice Actions
studioActionRegistry.register({
  id: 'audio.synthesize_voice',
  title: 'Synthesize Spoken Voiceover',
  description: 'Generate high-fidelity dialogue audio for selected screenplay beat',
  category: 'audio',
  keywords: ['voice', 'speech', 'tts', 'kokoro', 'dialogue', 'audio'],
  execute: async (ctx, params?: { nodeId?: string; text?: string; voicePreset?: string }) => {
    if (!ctx.project) return;
    const targetNodeId = params?.nodeId || ctx.selectedNodeId;
    if (!targetNodeId) {
      toast.warning('Select a screenplay beat node first to synthesize voiceover');
      return;
    }
    const node = ctx.project.nodes[targetNodeId];
    if (!node) return;

    const dialogueText = params?.text || node.artifacts?.textContent || node.prompt;
    if (!dialogueText || !dialogueText.trim()) {
      toast.warning('Please enter dialogue text for voiceover');
      return;
    }

    toast.info('Synthesizing speech via offline audio stack...');
    const res = await apiFetch(`/api/projects/${ctx.project.id}/nodes/${targetNodeId}/synthesize-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: dialogueText,
        voicePreset: params?.voicePreset || 'narrator_daniel',
      }),
    });
    const data = await res.json();
    if (data.success && data.node) {
      ctx.onUpdateProject({
        ...ctx.project,
        nodes: {
          ...ctx.project.nodes,
          [targetNodeId]: data.node,
        },
      });
      toast.success(`Voice synthesized (${data.durationSec}s)`);
      return data;
    } else {
      throw new Error(data.error || 'Failed to synthesize speech');
    }
  },
});
