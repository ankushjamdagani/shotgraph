import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { nanoid } from 'nanoid';
import { ProjectRegistry, GlobalStylePreset } from './projectRegistry.js';
import { ProjectMigrationService } from './projectMigrationService.js';
import { GraphEdge, TypedPortDefinition, StudioProjectGraph } from './graphEngine.js';

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

export type ProductionStage =
  | 'ideation'    // 1. Premise, hooks, angles
  | 'taste'       // 2. STYLE.md, palette, lighting rules
  | 'script'      // 3. Master dialogue & scene breakdown
  | 'assets'      // 4. Characters, products, environment anchors
  | 'shot'        // 5. Storyboard framing, lens, camera motion & rich prompt
  | 'storyboard'  // legacy alias for shot
  | 'footage'     // 6. Concrete rendered MP4 video takes & audio stems
  | 'motion'      // legacy alias for footage
  | 'voice'       // legacy alias for audio
  | 'vfx'         // 7. Alpha channel motion graphics, kinetic text & visual effects (Track V2)
  | 'assembly'    // 8. Final active cut timeline & DaVinci Resolve FCPXML bundle
  | 'render';     // legacy alias for assembly

export interface VersionNode {
  id: string;
  type?: string;
  inputPorts?: Record<string, TypedPortDefinition>;
  outputPorts?: Record<string, TypedPortDefinition>;
  hash?: string;
  isDirty?: boolean;
  parentId: string | null;
  sceneId?: string; // Optional: populated for scene, shot, footage, vfx nodes
  shotId?: string; // Optional: links footage or vfx to a specific shot
  subjectAnchorId?: string; // Optional: populated for subject asset nodes
  versionLabel: string; // e.g. "v1", "v2-humorous"
  stage: ProductionStage;
  stageOrder?: number; // 1 to 8 for horizontal layout
  title: string;
  modelEngine: 'antigravity-cli' | 'claude-cli' | 'ollama' | 'hyperframes' | 'external';
  modelName?: string;
  prompt: string;
  boundSubjectAnchorIds?: string[];
  position?: { x: number; y: number }; // 2D freeform spatial coordinates
  width?: number; // Custom resized width in px (default 320)
  colorTag?: 'default' | 'white' | 'blue' | 'purple' | 'emerald' | 'amber';
  isPinned?: boolean;
  isStale?: boolean;
  staleReason?: string;
  shotContextOverrides?: {
    lensFocalLength?: string;
    aperture?: string;
    cameraMovement?: string;
    motionSpeed?: 'slow_cinematic' | 'normal' | 'high_energy' | 'time_lapse';
    continuityNotes?: string;
  };
  assetMetadata?: {
    isMasterStyleAnchor?: boolean;
    styleReferenceAssetUrl?: string; // e.g. points to Anya var_01.png
    turnaroundAngle?: 'portrait' | 'three_quarter' | 'full_body' | 'macro_detail';
  };
  vfxMetadata?: {
    overlayType?: 'kinetic_text' | 'ui_mockup' | 'callout_badge' | 'atmospheric_vfx';
    inPointSec?: number;
    durationSec?: number;
    blendMode?: 'normal' | 'screen' | 'multiply' | 'additive';
  };
  externalFallback?: {
    platform: string;
    synthesizedPrompt: string;
    status: 'prompt_copied' | 'asset_imported';
  };
  artifacts: {
    textContent?: string;
    mediaUrl?: string; // e.g. MP4, PNG, WAV
    audioUrl?: string; // Voice stem or sound design WAV/MP3
    alphaOverlayUrl?: string; // ProRes 4444 MOV with alpha
    wordTimingsJson?: string;
    scriptBeats?: any[];
    metadata?: Record<string, any>;
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
  masterStyleAnchorAssetUrl?: string; // Designates project-wide style reference
  basePresetId?: string;
  styleOverrides?: Record<string, any>;
  additionalConstraints?: string[];
  styleMarkdown: string;
  styleTokens: Record<string, any>;
  stickyNotes?: Array<{
    id: string;
    text: string;
    color: 'yellow' | 'cyan' | 'rose' | 'emerald';
    isPinned?: boolean;
    position: { x: number; y: number };
  }>;
  schemaVersion?: number;
  edges?: Record<string, GraphEdge>;
  activeSinkNodeId?: string;
  activePathNodeIds?: string[];
}

export interface GenesisBranchConfig {
  id: number;
  title: string;
  aesthetic: string;
  customLook?: string;
  beats?: Array<{ label: string; text: string }>;
}

export type ModelEngineType = 'antigravity-cli' | 'claude-cli' | 'ollama' | 'hyperframes' | 'external';

export interface GenesisProjectConfig {
  mood?: string;
  customMood?: string;
  modelEngine?: ModelEngineType;
  directorDirective?: string;
  branches?: GenesisBranchConfig[];
  referenceUrls?: string[];
  customSpecs?: string;
}

export interface ProjectInitOptions {
  aspectRatio?: '9:16' | '16:9' | '1:1';
  fps?: number;
  targetDurationSec?: number;
  preset?: 'reel_9_16' | 'youtube_16_9' | 'ad_1_1';
  basePresetId?: string;
  initGit?: boolean;
  ideaPrompt?: string;
  emptyDAG?: boolean;
  genesisConfig?: GenesisProjectConfig;
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

    // Create complete 8-stage video production DAG starting from Idea (or blank if emptyDAG requested)
    const initialNodes: Record<string, VersionNode> = {};
    const activeCut: Record<string, string> = {};

    let finalScenes = scenes;
    if (options?.emptyDAG) {
      finalScenes = []; // No scenes until scripted!
      const ideaPrompt =
        options?.ideaPrompt?.trim() ||
        `Launch concept for "${name}": High-energy premise with dynamic visual storytelling.`;

      initialNodes['node_idea_01'] = {
        id: 'node_idea_01',
        parentId: null,
        versionLabel: 'v1.0 (Idea)',
        stage: 'ideation',
        title: name,
        modelEngine: (options?.genesisConfig?.modelEngine as ModelEngineType) || 'antigravity-cli',
        prompt: ideaPrompt,
        position: { x: 120, y: 120 },
        artifacts: {
          textContent: `Core Premise: ${ideaPrompt}`,
          metadata: { genesisConfig: options?.genesisConfig },
        },
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'ready',
        },
      };
    } else if (options?.genesisConfig?.branches && options.genesisConfig.branches.length > 0) {
      // Genesis: Independent, detached root Idea nodes stacked vertically (No default scenes)
      finalScenes = [];
      const genConfig = options.genesisConfig;
      const branches = genConfig.branches || [];

      branches.forEach((branch, idx) => {
        const nodeId = `node_idea_var_${idx + 1}`;
        const beatsText = branch.beats && branch.beats.length > 0
          ? branch.beats.map((b) => `${b.label}: ${b.text}`).join('\n\n')
          : branch.title;

        const fullDescription = `${beatsText}\n\nVisual Aesthetic: ${branch.aesthetic}${branch.customLook ? ` (${branch.customLook})` : ''}\nMood Energy: ${genConfig.mood || 'Adrenaline & Speed'}${genConfig.customMood ? `\nCustom Mood Notes: ${genConfig.customMood}` : ''}${genConfig.referenceUrls?.length ? `\nReferences: ${genConfig.referenceUrls.join(', ')}` : ''}`;

        initialNodes[nodeId] = {
          id: nodeId,
          parentId: null, // Fully detached independent root!
          versionLabel: `v1.0 (Idea Branch ${idx + 1})`,
          stage: 'ideation',
          title: branch.title,
          modelEngine: (genConfig.modelEngine as ModelEngineType) || 'antigravity-cli',
          prompt: beatsText,
          position: { x: 120, y: 120 + idx * 320 }, // Vertically stacked
          artifacts: {
            textContent: fullDescription,
            metadata: {
              genesisConfig: genConfig,
              aesthetic: branch.aesthetic,
              customLook: branch.customLook,
              mood: genConfig.mood,
              referenceUrls: genConfig.referenceUrls || [],
              beats: branch.beats || [],
            },
          },
          metadata: {
            createdAt: new Date().toISOString(),
            status: 'ready',
          },
        };

        const tasteNodeId = `node_taste_var_${idx + 1}`;
        initialNodes[tasteNodeId] = {
          id: tasteNodeId,
          parentId: nodeId,
          versionLabel: `v1.0 (${branch.aesthetic})`,
          stage: 'taste',
          title: `${branch.aesthetic} DNA`,
          modelEngine: (genConfig.modelEngine as ModelEngineType) || 'antigravity-cli',
          prompt: `Visual Aesthetic: ${branch.aesthetic}${branch.customLook ? ` - ${branch.customLook}` : ''}\nLighting, color grading, and lens optics.`,
          position: { x: 480, y: 120 + idx * 320 },
          artifacts: {
            textContent: `Style DNA: ${branch.aesthetic}\nCustom Look: ${branch.customLook || 'Standard Studio'}\nMood: ${genConfig.mood || 'Dynamic'}`,
            metadata: {
              aesthetic: branch.aesthetic,
              customLook: branch.customLook,
              mood: genConfig.mood,
            },
          },
          metadata: {
            createdAt: new Date().toISOString(),
            status: 'ready',
          },
        };
      });
    } else {
      const ideaPrompt =
        options?.ideaPrompt?.trim() ||
        `Launch concept for "${name}": High-energy premise with dynamic visual storytelling, rhythmic pacing, and cinematic punch.`;

      // 1. Stage: Ideation Root Node
      initialNodes['node_idea_01'] = {
        id: 'node_idea_01',
        parentId: null,
        versionLabel: 'v1.0 (Premise)',
        stage: 'ideation',
        title: 'Idea Concept & Thesis',
        modelEngine: 'antigravity-cli',
        prompt: ideaPrompt,
        position: { x: 60, y: 120 },
        artifacts: {
          textContent: `Core Premise: ${ideaPrompt}\n\nAudience: Modern creative professionals & trendsetters\nPacing: Fast hook (0-3s), narrative immersion (3-20s), high-impact CTA (20-30s).`,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'ready',
        },
      };

    // 2. Stage: Taste & Style DNA Node
    initialNodes['node_taste_01'] = {
      id: 'node_taste_01',
      parentId: 'node_idea_01',
      versionLabel: 'v1.0 (Director Taste)',
      stage: 'taste',
      title: 'Visual Identity & Film DNA',
      modelEngine: 'antigravity-cli',
      prompt: 'Editorial 35mm aesthetic, Kodak Portra 400 warmth, balanced daylight, subtle organic halation, restrained palette #F5EFEB and #C2412D.',
      position: { x: 60, y: 380 },
      artifacts: {
        textContent: 'Visual Signature: Editorial grain with natural skin tones, soft anamorphic roll-off, and architectural lighting.',
      },
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'ready',
      },
    };

    // 3. Stage: Scene 1 Master Script Node
    initialNodes['node_scene_01_v1'] = {
      id: 'node_scene_01_v1',
      parentId: 'node_idea_01',
      sceneId: 'scene_01',
      versionLabel: 'v1.0 (Hook Script)',
      stage: 'script',
      title: 'Scene 1: The Hook Screenplay',
      modelEngine: 'antigravity-cli',
      prompt: 'Opening hook: High-stakes confrontation of the core premise within first 3 seconds.',
      position: { x: 420, y: 120 },
      boundSubjectAnchorIds: ['subj_lead'],
      artifacts: {
        textContent: 'Look closely. Everything you thought was impossible about video creation just changed.',
      },
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'ready',
      },
    };

    // 4. Stage: Subject Consistency Anchor
    initialNodes['node_asset_01'] = {
      id: 'node_asset_01',
      parentId: 'node_taste_01',
      versionLabel: 'v1.0 (Master Anchor)',
      stage: 'assets',
      title: 'Lead Presenter (Style Anchor)',
      modelEngine: 'antigravity-cli',
      prompt: 'Photorealistic character turnaround of charismatic lead presenter in bespoke modern attire, 35mm portrait, natural daylight.',
      position: { x: 780, y: 120 },
      subjectAnchorId: 'subj_lead',
      assetMetadata: {
        isMasterStyleAnchor: true,
        turnaroundAngle: 'three_quarter',
        styleReferenceAssetUrl: 'assets/subjects/lead/three_quarter.png',
      },
      artifacts: {
        mediaUrl: 'assets/subjects/lead/three_quarter.png',
      },
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'ready',
      },
    };

    // 5. Stage: Shot Director & Optics
    initialNodes['node_shot_01'] = {
      id: 'node_shot_01',
      parentId: 'node_scene_01_v1',
      sceneId: 'scene_01',
      versionLabel: 'v1.0 (Framing)',
      stage: 'shot',
      title: 'Shot 1.1: Slow Push-In Z',
      modelEngine: 'external',
      prompt: 'Medium close-up, subject turns to camera with focused gaze, anamorphic 35mm at f/1.8, warm morning lighting.',
      position: { x: 1140, y: 120 },
      boundSubjectAnchorIds: ['subj_lead'],
      shotContextOverrides: {
        lensFocalLength: '35mm Anamorphic',
        aperture: 'f/1.8',
        cameraMovement: 'Slow Push-In Z-Axis',
      },
      artifacts: {},
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'ready',
      },
    };

    // 6. Stage: Video Take Candidate
    initialNodes['node_footage_01'] = {
      id: 'node_footage_01',
      parentId: 'node_shot_01',
      sceneId: 'scene_01',
      versionLabel: 'v1.0 (Active Cut)',
      stage: 'footage',
      title: 'Take 1: Runway Gen-3 4K',
      modelEngine: 'external',
      prompt: 'Cinematic 4K 24fps live cut, organic grain, high fidelity',
      position: { x: 1500, y: 120 },
      artifacts: {
        mediaUrl: 'assets/video_clips/scene_01_take_01.mp4',
      },
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'ready',
      },
    };
    activeCut['scene_01'] = 'node_footage_01';

    // 7. Stage: VFX & Overlays
    initialNodes['node_vfx_01'] = {
      id: 'node_vfx_01',
      parentId: 'node_footage_01',
      sceneId: 'scene_01',
      versionLabel: 'v1.0 (Kinetic VFX)',
      stage: 'vfx',
      title: 'VFX: Kinetic Title & Stat Badge',
      modelEngine: 'antigravity-cli',
      prompt: 'Clean typography overlay with motion blur, tracking with camera push-in',
      position: { x: 1860, y: 120 },
      vfxMetadata: {
        overlayType: 'kinetic_text',
        inPointSec: 0.5,
        durationSec: 2.0,
        blendMode: 'screen',
      },
      artifacts: {
        textContent: '01 // THE PARADIGM SHIFT',
      },
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'ready',
      },
    };

    // 8. Stage: Master Timeline Assembly (NLE)
    initialNodes['node_assembly_01'] = {
      id: 'node_assembly_01',
      parentId: 'node_vfx_01',
      versionLabel: 'v1.0 (Master Cut)',
      stage: 'assembly',
      title: 'Master Timeline Assembly (NLE)',
      modelEngine: 'antigravity-cli',
      prompt: 'Full multi-track timeline assembly ready for DaVinci Resolve export',
      position: { x: 2220, y: 120 },
      artifacts: {},
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'ready',
      },
    };

    // For remaining scenes (Scene 2, 3, etc.), create connected script beats branching from Idea
    scenes.slice(1).forEach((scene, idx) => {
      const nodeId = `node_${scene.id}_v1`;
      initialNodes[nodeId] = {
        id: nodeId,
        parentId: 'node_idea_01',
        sceneId: scene.id,
        versionLabel: `v1.0 (${scene.name})`,
        stage: 'script',
        title: `${scene.name} v1`,
        modelEngine: 'antigravity-cli',
        prompt: `Screenplay beat for ${scene.name} of ${name}`,
        position: { x: 420, y: 360 + idx * 240 },
        boundSubjectAnchorIds: ['subj_lead'],
        artifacts: {
          textContent: `Screenplay narrative for ${scene.name}. Target duration: ${scene.targetDurationSec}s.`,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'idle',
        },
      };
      activeCut[scene.id] = nodeId;
    });
  }

    const basePresetId = options?.basePresetId || 'liquid_glass';
    const basePreset = await ProjectRegistry.getStylePreset(basePresetId);
    const resolvedStyle = ProjectRegistry.resolveCompositeStyle(basePreset, {}, []);

    const initialProject: FilmProject = {
      id: nanoid(8),
      name,
      projectRoot,
      targetDurationSec,
      aspectRatio,
      fps,
      scenes: finalScenes,
      activeCut,
      nodes: initialNodes,
      subjectAnchors: [],
      basePresetId,
      styleOverrides: {},
      additionalConstraints: [],
      styleMarkdown: resolvedStyle.markdown,
      styleTokens: resolvedStyle.tokens,
    };

    const project = ProjectMigrationService.migrateProjectV2toV3(initialProject) as FilmProject;

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
      const raw = JSON.parse(data);
      const project = ProjectMigrationService.migrateProjectV2toV3(raw) as FilmProject;
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
    const projectV3 = ProjectMigrationService.migrateProjectV2toV3(project) as FilmProject;
    await fs.writeFile(projectJsonPath, JSON.stringify(projectV3, null, 2), 'utf-8');
    if (project.styleMarkdown) {
      await fs.writeFile(path.join(project.projectRoot, 'STYLE.md'), project.styleMarkdown, 'utf-8');
    }
    await ProjectRegistry.registerProject(project.projectRoot, projectV3, {
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

    const prefix = parent.sceneId || parent.stage || 'node';
    const newNodeId = `node_${prefix}_${nanoid(6)}`;
    const newNode: VersionNode = {
      id: newNodeId,
      parentId: parentNodeId,
      sceneId: parent.sceneId,
      shotId: parent.shotId,
      subjectAnchorId: parent.subjectAnchorId,
      versionLabel,
      stage: parent.stage,
      stageOrder: parent.stageOrder,
      title: `${parent.title} (${versionLabel})`,
      modelEngine: modelEngine || parent.modelEngine,
      prompt,
      boundSubjectAnchorIds: parent.boundSubjectAnchorIds ? [...parent.boundSubjectAnchorIds] : undefined,
      shotContextOverrides: parent.shotContextOverrides ? { ...parent.shotContextOverrides } : undefined,
      assetMetadata: parent.assetMetadata ? { ...parent.assetMetadata } : undefined,
      vfxMetadata: parent.vfxMetadata ? { ...parent.vfxMetadata } : undefined,
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

  /**
   * Deletes a node and safely re-parents downstream child edges.
   * If deleteFilesFromSystem is true, also deletes or trashes any associated media artifacts on disk.
   */
  static async deleteVersionNode(
    project: FilmProject,
    nodeId: string,
    deleteFilesFromSystem = false
  ): Promise<FilmProject> {
    const target = project.nodes[nodeId];
    if (!target) return project;
    const parentId = target.parentId;

    // If requested, clean up generated media files from system
    if (deleteFilesFromSystem) {
      const mediaFilesToDelete: string[] = [];
      if (target.artifacts?.mediaUrl) {
        mediaFilesToDelete.push(target.artifacts.mediaUrl);
      }
      if (target.artifacts?.alphaOverlayUrl) {
        mediaFilesToDelete.push(target.artifacts.alphaOverlayUrl);
      }
      if (target.artifacts?.audioUrl) {
        mediaFilesToDelete.push(target.artifacts.audioUrl);
      }
      if (target.assetMetadata?.styleReferenceAssetUrl) {
        mediaFilesToDelete.push(target.assetMetadata.styleReferenceAssetUrl);
      }

      const root = project.projectRoot || (project as any).path;
      for (const relPath of mediaFilesToDelete) {
        if (!relPath) continue;
        const absPath = path.isAbsolute(relPath) ? relPath : path.join(root, relPath);
        try {
          await execAsync(`osascript -e 'tell application "Finder" to delete POSIX file "${absPath}"'`);
        } catch {
          try {
            await fs.rm(absPath, { force: true });
          } catch {
            // Ignore missing files or non-critical cleanup failures
          }
        }
      }
    }

    // Re-link children to parent
    for (const node of Object.values(project.nodes)) {
      if (node.parentId === nodeId) {
        node.parentId = parentId;
      }
    }

    // Clean up activeCut if target was the active cut
    for (const [sceneId, activeId] of Object.entries(project.activeCut)) {
      if (activeId === nodeId) {
        const sibling = Object.values(project.nodes).find(
          (n) => n.sceneId === sceneId && n.id !== nodeId
        );
        if (sibling) {
          project.activeCut[sceneId] = sibling.id;
        } else if (parentId && project.nodes[parentId]) {
          project.activeCut[sceneId] = parentId;
        } else {
          delete project.activeCut[sceneId];
        }
      }
    }

    delete project.nodes[nodeId];
    await this.saveProject(project);
    return project;
  }

  /**
   * Updates fields on an existing node.
   */
  static async updateNode(
    project: FilmProject,
    nodeId: string,
    patch: Partial<VersionNode>
  ): Promise<VersionNode> {
    if (!project.nodes[nodeId]) {
      throw new Error(`Node "${nodeId}" not found in project.`);
    }

    project.nodes[nodeId] = {
      ...project.nodes[nodeId],
      ...patch,
      shotContextOverrides: {
        ...(project.nodes[nodeId].shotContextOverrides || {}),
        ...(patch.shotContextOverrides || {}),
      },
      assetMetadata: {
        ...(project.nodes[nodeId].assetMetadata || {}),
        ...(patch.assetMetadata || {}),
      },
      vfxMetadata: {
        ...(project.nodes[nodeId].vfxMetadata || {}),
        ...(patch.vfxMetadata || {}),
      },
    };

    await this.saveProject(project);
    return project.nodes[nodeId];
  }
}
