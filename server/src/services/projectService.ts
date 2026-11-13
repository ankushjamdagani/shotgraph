import * as fs from 'fs/promises';
import * as path from 'path';
import { nanoid } from 'nanoid';

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
  styleMarkdown: string;
  styleTokens: Record<string, any>;
}

export class ProjectService {
  /**
   * Initializes a new self-contained Git-native project folder structure.
   */
  static async initProject(projectRoot: string, name: string): Promise<FilmProject> {
    const subdirs = [
      '.studio',
      'raw_footage',
      'references',
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

    // Default scenes for a short film/reel
    const scenes = [
      { id: 'scene_01', name: 'Scene 1: The Hook', order: 1, targetDurationSec: 3 },
      { id: 'scene_02', name: 'Scene 2: Core Value & Problem', order: 2, targetDurationSec: 10 },
      { id: 'scene_03', name: 'Scene 3: Proof & Feature Reveal', order: 3, targetDurationSec: 12 },
      { id: 'scene_04', name: 'Scene 4: Call to Action', order: 4, targetDurationSec: 5 },
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

    const defaultStyle = `# PROJECT STYLE GUIDE (STYLE.md)

### Archetype & Vibe
- **Dominant Style**: LIQUID GLASS
- **Cut Rhythm**: fast_snappy (Average cut: 1.6s)

### Color Palette
- Background: \`#0F172A\`
- Card Container: \`#1E293B\`
- Accent: \`#38BDF8\`
- Text: \`#F8FAFC\`

### Typography
- Display / Headings: \`Inter-700\` (sentence_case)
- Body Copy: \`Inter-400\`

### Motion Engineering
- Easing Curve: \`power3.out\`
- Overshoot: Enabled (tactile bounce)
- Key Moves: rise, pop, count-up, checklist-tick

### Audio & Sound Design
- Master Target: -14 LUFS
- Music Ducking Depth: -15 dB under speech
- SFX Palette: subtle_click, counter_roll, chime

### Banned Aesthetics (Negative Constraints)
- No generic AI purple or neon rainbow button glows
- No cartoonish 3D floating without ground contact shadow
- No unmotivated whooshes on basic card slides
- No text inside Instagram safe margins (top 10%, bottom 20%, right 15%)
`;

    const project: FilmProject = {
      id: nanoid(8),
      name,
      projectRoot,
      targetDurationSec: 30,
      aspectRatio: '9:16',
      fps: 30,
      scenes,
      activeCut,
      nodes: initialNodes,
      styleMarkdown: defaultStyle,
      styleTokens: {
        archetype: 'liquid_glass',
        palette: {
          background: '#0F172A',
          card: '#1E293B',
          accent: '#38BDF8',
          text: '#F8FAFC',
        },
      },
    };

    // Save project state files
    await fs.writeFile(
      path.join(projectRoot, '.studio', 'project.json'),
      JSON.stringify(project, null, 2),
      'utf-8'
    );
    await fs.writeFile(path.join(projectRoot, 'STYLE.md'), defaultStyle, 'utf-8');

    return project;
  }

  /**
   * Loads project state from disk.
   */
  static async loadProject(projectRoot: string): Promise<FilmProject> {
    const projectJsonPath = path.join(projectRoot, '.studio', 'project.json');
    try {
      const data = await fs.readFile(projectJsonPath, 'utf-8');
      return JSON.parse(data) as FilmProject;
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
