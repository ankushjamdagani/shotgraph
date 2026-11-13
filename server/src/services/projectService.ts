import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { nanoid } from 'nanoid';
import { ProjectRegistry, GlobalStylePreset } from './projectRegistry.js';

const execAsync = promisify(exec);

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
  versionLabel: string; // e.g. "v1", "v2-humorous"
  stage: 'ideation' | 'taste' | 'script' | 'storyboard' | 'voice' | 'motion' | 'render';
  title: string;
  modelEngine: 'antigravity-cli' | 'claude-cli' | 'ollama' | 'hyperframes' | 'external';
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
    mediaUrl?: string; // e.g. MP4, PNG, WAV
    alphaOverlayUrl?: string; // ProRes 4444 MOV with alpha
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

export interface ProjectInitOptions {
  aspectRatio?: '9:16' | '16:9' | '1:1';
  fps?: number;
  targetDurationSec?: number;
  preset?: 'reel_9_16' | 'youtube_16_9' | 'ad_1_1';
  basePresetId?: string;
  initGit?: boolean;
}

export class ProjectService {
  /**
   * Initializes a new self-contained Git-native project folder structure.
   */
  static async initProject(
    projectRoot: string,
    name: string,
    options?: ProjectInitOptions
  ): Promise<FilmProject> {
    const subdirs = [
      '.studio',
      'raw_footage',
      'references',
      'assets/subjects',
      'assets/voice',
      'assets/sfx',
      'assets/music',
      'assets/images',
      'assets/video_clips',
      'compositions',
      'exports/drafts',
      'exports/davinci_bundle',
    ];

    for (const dir of subdirs) {
      await fs.mkdir(path.join(projectRoot, dir), { recursive: true });
    }

    // Git initialization
    if (options?.initGit !== false) {
      try {
        await fs.access(path.join(projectRoot, '.git'));
      } catch {
        try {
          await execAsync('git init', { cwd: projectRoot });
        } catch {
          // Non-blocking if git is not available
        }
      }
    }

    const aspectRatio: '9:16' | '16:9' | '1:1' =
      options?.aspectRatio ||
      (options?.preset === 'youtube_16_9' ? '16:9' : options?.preset === 'ad_1_1' ? '1:1' : '9:16');
    const targetDurationSec =
      options?.targetDurationSec ||
      (options?.preset === 'youtube_16_9' ? 60 : options?.preset === 'ad_1_1' ? 15 : 30);
    const fps = options?.fps || 30;

    // Default scenes tailored to duration
    const scenes =
      targetDurationSec <= 15
        ? [
            { id: 'scene_01', name: 'Scene 1: Hook & Core Problem', order: 1, targetDurationSec: 3 },
            { id: 'scene_02', name: 'Scene 2: Solution & Proof', order: 2, targetDurationSec: 8 },
            { id: 'scene_03', name: 'Scene 3: Direct Offer / CTA', order: 3, targetDurationSec: 4 },
          ]
        : [
            { id: 'scene_01', name: 'Scene 1: The Hook', order: 1, targetDurationSec: 3 },
            { id: 'scene_02', name: 'Scene 2: Core Value & Problem', order: 2, targetDurationSec: Math.floor(targetDurationSec * 0.35) },
            { id: 'scene_03', name: 'Scene 3: Proof & Feature Reveal', order: 3, targetDurationSec: Math.floor(targetDurationSec * 0.45) },
            { id: 'scene_04', name: 'Scene 4: Call to Action', order: 4, targetDurationSec: Math.max(4, targetDurationSec - 3 - Math.floor(targetDurationSec * 0.35) - Math.floor(targetDurationSec * 0.45)) },
          ];

    // Create root nodes for each scene
    const initialNodes: Record<string, VersionNode> = {};
    const activeCut: Record<string, string> = {};

    scenes.forEach((scene) => {
      const nodeId = `node_${scene.id}_v1`;
      initialNodes[nodeId] = {
        id: nodeId,
        parentId: null,
        sceneId: scene.id,
        versionLabel: 'v1.0 (Initial Draft)',
        stage: 'script',
        title: `${scene.name} v1`,
        modelEngine: 'antigravity-cli',
        prompt: `Draft ${scene.name} for video ${name}`,
        artifacts: {
          textContent: `Initial draft for ${scene.name}`,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'idle',
        },
      };
      activeCut[scene.id] = nodeId;
    });

    const basePresetId = options?.basePresetId || 'liquid_glass';
    const basePreset = await ProjectRegistry.getStylePreset(basePresetId);
    const resolvedStyle = ProjectRegistry.resolveCompositeStyle(basePreset, {}, []);

    const project: FilmProject = {
      id: nanoid(8),
      name,
      projectRoot,
      targetDurationSec,
      aspectRatio,
      fps,
      scenes,
      activeCut,
      nodes: initialNodes,
      subjectAnchors: [],
      basePresetId,
      styleOverrides: {},
      additionalConstraints: [],
      styleMarkdown: resolvedStyle.markdown,
      styleTokens: resolvedStyle.tokens,
    };

    // Save project state files
    await fs.writeFile(
      path.join(projectRoot, '.studio', 'project.json'),
      JSON.stringify(project, null, 2),
      'utf-8'
    );
    await fs.writeFile(path.join(projectRoot, 'STYLE.md'), resolvedStyle.markdown, 'utf-8');

    // Register in central recent list
    await ProjectRegistry.registerProject(projectRoot, project, {
      basePresetId,
      styleOverrides: {},
      additionalConstraints: [],
    });

    return project;
  }

  /**
   * Loads project state from disk.
   */
  static async loadProject(projectRoot: string): Promise<FilmProject> {
    const projectJsonPath = path.join(projectRoot, '.studio', 'project.json');
    try {
      const data = await fs.readFile(projectJsonPath, 'utf-8');
      const project = JSON.parse(data) as FilmProject;
      project.subjectAnchors = project.subjectAnchors || [];
      // Register in central index as recently opened
      await ProjectRegistry.registerProject(projectRoot, project, {
        basePresetId: project.basePresetId,
        styleOverrides: project.styleOverrides,
        additionalConstraints: project.additionalConstraints,
      });
      return project;
    } catch {
      // If project doesn't exist yet, initialize it automatically
      return this.initProject(projectRoot, path.basename(projectRoot));
    }
  }

  /**
   * Persists project state to disk.
   */
  static async saveProject(project: FilmProject): Promise<void> {
    const projectJsonPath = path.join(project.projectRoot, '.studio', 'project.json');
    await fs.writeFile(projectJsonPath, JSON.stringify(project, null, 2), 'utf-8');
    if (project.styleMarkdown) {
      await fs.writeFile(path.join(project.projectRoot, 'STYLE.md'), project.styleMarkdown, 'utf-8');
    }
    await ProjectRegistry.registerProject(project.projectRoot, project, {
      basePresetId: project.basePresetId,
      styleOverrides: project.styleOverrides,
      additionalConstraints: project.additionalConstraints,
    });
  }

  /**
   * Branches an existing node into a new parallel version node.
   */
  static async branchVersionNode(
    project: FilmProject,
    parentNodeId: string,
    versionLabel: string,
    prompt: string,
    modelEngine?: VersionNode['modelEngine']
  ): Promise<VersionNode> {
    const parent = project.nodes[parentNodeId];
    if (!parent) {
      throw new Error(`Parent node "${parentNodeId}" not found in project DAG.`);
    }

    const newNodeId = `node_${parent.sceneId}_${nanoid(6)}`;
    const newNode: VersionNode = {
      id: newNodeId,
      parentId: parentNodeId,
      sceneId: parent.sceneId,
      versionLabel,
      stage: parent.stage,
      title: `${parent.title} → ${versionLabel}`,
      modelEngine: modelEngine || parent.modelEngine,
      prompt,
      artifacts: { ...parent.artifacts },
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'idle',
      },
    };

    project.nodes[newNodeId] = newNode;
    await this.saveProject(project);

    return newNode;
  }

  /**
   * Sets the active version node for a scene in the timeline cut.
   */
  static async setActiveCutNode(
    project: FilmProject,
    sceneId: string,
    nodeId: string
  ): Promise<void> {
    if (!project.nodes[nodeId]) {
      throw new Error(`Node "${nodeId}" does not exist in project DAG.`);
    }
    project.activeCut[sceneId] = nodeId;
    await this.saveProject(project);
  }
}
