import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface ProjectRegistryInput {
  id: string;
  name: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  fps?: number;
  targetDurationSec?: number;
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
  previewVideoUrl?: string;
  dagNodes?: Array<{
    id: string;
    stage: string;
    title: string;
    parentId: string | null;
  }>;
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

const DEFAULT_STYLE_PRESETS: GlobalStylePreset[] = [
  {
    id: 'liquid_glass',
    name: 'Liquid Glass (Default Studio)',
    description: 'Frosted dark acrylic, glowing cyan accents, power3.out easing, high-tech retention cards.',
    archetype: 'liquid_glass',
    tokens: {
      palette: {
        background: '#0B0F19',
        card: '#1E293B',
        accent: '#38BDF8',
        text: '#F8FAFC',
      },
      typography: {
        displayFont: 'Inter-700',
        bodyFont: 'Inter-400',
        headingCase: 'sentence_case',
      },
      pacing: {
        avgCutDurationSec: 1.6,
        rhythm: 'fast_snappy',
        usefulPauses: true,
      },
      motion: {
        easingCurve: 'power3.out',
        overshoot: true,
        primaryMoves: ['rise', 'pop', 'count-up', 'checklist-tick'],
      },
      audioRules: {
        targetLufs: -14,
        musicDuckingDb: 15,
        sfxSignature: ['subtle_click', 'counter_roll', 'chime'],
      },
      negativeConstraints: [
        'No generic AI rainbow gradients or purple glow buttons',
        'No unmotivated whooshes on basic static elements',
        'Keep all text outside the Instagram safe margins (top 10%, bottom 20%)',
      ],
    },
    styleDocMarkdown: `# STYLE: Liquid Glass\n\n- Palette: Dark Navy & Cyan Accent (#38BDF8)\n- Easing: power3.out with dynamic overshoot\n- Pacing: 1.6s average cut cadence`,
    updatedAt: Date.now(),
  },
  {
    id: 'kinetic_type',
    name: 'Kinetic Creator Bold',
    description: 'High-contrast typography, electric yellow accents, aggressive punch-cuts and sound design.',
    archetype: 'kinetic_type',
    tokens: {
      palette: {
        background: '#0A0A0A',
        card: '#18181B',
        accent: '#FACC15',
        text: '#FFFFFF',
      },
      typography: {
        displayFont: 'ArchivoBlack-400',
        bodyFont: 'Inter-600',
        headingCase: 'uppercase',
      },
      pacing: {
        avgCutDurationSec: 1.2,
        rhythm: 'fast_snappy',
        usefulPauses: false,
      },
      motion: {
        easingCurve: 'power4.out',
        overshoot: true,
        primaryMoves: ['punch-in', 'pop', 'slide-in', 'typewriter'],
      },
      audioRules: {
        targetLufs: -13,
        musicDuckingDb: 18,
        sfxSignature: ['punch_hit', 'riser', 'pop'],
      },
      negativeConstraints: [
        'No cursive or thin serif fonts',
        'No cuts exceeding 2.2 seconds without visual movement or reframe',
        'No clutter in top 15% and bottom 20%',
      ],
    },
    styleDocMarkdown: `# STYLE: Kinetic Creator Bold\n\n- Palette: Deep Obsidian & Electric Yellow (#FACC15)\n- Easing: power4.out\n- Pacing: 1.2s rapid cut cadence`,
    updatedAt: Date.now(),
  },
  {
    id: 'editorial_grain',
    name: 'Editorial Grain & Paper',
    description: 'Warm organic paper background, editorial serif typography, warm vermilion accent, cinematic rhythm.',
    archetype: 'editorial_grain',
    tokens: {
      palette: {
        background: '#F5EFEB',
        card: '#FFFFFF',
        accent: '#C2412D',
        text: '#1C1917',
      },
      typography: {
        displayFont: 'InstrumentSerif-400',
        bodyFont: 'Inter-400',
        headingCase: 'mixed',
      },
      pacing: {
        avgCutDurationSec: 2.4,
        rhythm: 'cinematic_unhurried',
        usefulPauses: true,
      },
      motion: {
        easingCurve: 'power2.out',
        overshoot: false,
        primaryMoves: ['rise', 'slide-in', 'reframe'],
      },
      audioRules: {
        targetLufs: -15,
        musicDuckingDb: 12,
        sfxSignature: ['soft_click', 'page_turn', 'vinyl_dust'],
      },
      negativeConstraints: [
        'No neon colors or synthetic glowing buttons',
        'No aggressive bouncy cartoon motion',
        'Preserve warm analog texture throughout',
      ],
    },
    styleDocMarkdown: `# STYLE: Editorial Grain & Paper\n\n- Palette: Warm Paper (#F5EFEB) & Vermilion (#C2412D)\n- Easing: power2.out\n- Pacing: 2.4s unhurried cinematic cadence`,
    updatedAt: Date.now(),
  },
  {
    id: 'pop_bold',
    name: 'Pop Bold Vibrant',
    description: 'Punchy electric violet and emerald, playful bouncy cards, energetic sound hits.',
    archetype: 'pop_bold',
    tokens: {
      palette: {
        background: '#0F0728',
        card: '#1E1242',
        accent: '#A855F7',
        text: '#FAF5FF',
      },
      typography: {
        displayFont: 'Syne-700',
        bodyFont: 'Inter-500',
        headingCase: 'sentence_case',
      },
      pacing: {
        avgCutDurationSec: 1.5,
        rhythm: 'fast_snappy',
        usefulPauses: true,
      },
      motion: {
        easingCurve: 'back.out(1.7)',
        overshoot: true,
        primaryMoves: ['pop', 'checklist-tick', 'bar-fill', 'rise'],
      },
      audioRules: {
        targetLufs: -14,
        musicDuckingDb: 14,
        sfxSignature: ['bubble_pop', 'chime', 'whoosh_soft'],
      },
      negativeConstraints: [
        'No dull grey backgrounds',
        'No harsh mechanical ease-in transitions',
        'Keep primary action centered',
      ],
    },
    styleDocMarkdown: `# STYLE: Pop Bold Vibrant\n\n- Palette: Vibrant Purple (#A855F7) on Midnight Indigo\n- Easing: back.out(1.7)\n- Pacing: 1.5s snappy cadence`,
    updatedAt: Date.now(),
  },
];

export class ProjectRegistry {
  private static getStudioHome(): string {
    return process.env.STUDIO_HOME || path.join(os.homedir(), '.studio');
  }

  private static getIndexFilePath(): string {
    return path.join(this.getStudioHome(), 'projects-index.json');
  }

  private static getPresetsDirPath(): string {
    return path.join(this.getStudioHome(), 'style-presets');
  }

  /**
   * Ensure ~/.studio structure and built-in style presets exist
   */
  static async initialize(): Promise<void> {
    const home = this.getStudioHome();
    const presetsDir = this.getPresetsDirPath();
    await fs.mkdir(home, { recursive: true });
    await fs.mkdir(presetsDir, { recursive: true });

    // Initialize projects index if absent
    try {
      await fs.access(this.getIndexFilePath());
    } catch {
      await fs.writeFile(this.getIndexFilePath(), JSON.stringify([], null, 2), 'utf-8');
    }

    // Seed default presets if absent
    for (const preset of DEFAULT_STYLE_PRESETS) {
      const presetPath = path.join(presetsDir, `${preset.id}.json`);
      try {
        await fs.access(presetPath);
      } catch {
        await fs.writeFile(presetPath, JSON.stringify(preset, null, 2), 'utf-8');
      }
    }
  }

  /**
   * List recent projects sorted by last opened time descending
   */
  static async listRecentProjects(): Promise<ProjectRegistryEntry[]> {
    await this.initialize();
    try {
      const raw = await fs.readFile(this.getIndexFilePath(), 'utf-8');
      const list = JSON.parse(raw) as ProjectRegistryEntry[];

      const enriched = await Promise.all(
        list.map(async (entry) => {
          try {
            const projectJsonPath = path.join(entry.path, '.studio', 'project.json');
            const dataStr = await fs.readFile(projectJsonPath, 'utf-8');
            const projectData = JSON.parse(dataStr);
            const nodesObj = projectData.nodes || {};
            const nodes = Object.values(nodesObj) as any[];

            // Look for video or media preview that actually exists on disk
            let videoUrl = entry.previewThumbnailUrl;
            if (!videoUrl) {
              const videoNode = nodes.find((n) => {
                if (!n.artifacts?.mediaUrl) return false;
                const isMedia =
                  n.artifacts.mediaUrl.endsWith('.mp4') ||
                  n.artifacts.mediaUrl.endsWith('.webm') ||
                  n.artifacts.mediaUrl.endsWith('.mov') ||
                  n.artifacts.mediaUrl.endsWith('.png') ||
                  n.artifacts.mediaUrl.endsWith('.jpg');
                if (!isMedia) return false;
                const fullMedia = path.join(entry.path, n.artifacts.mediaUrl);
                return fsSync.existsSync(fullMedia);
              });
              if (videoNode) {
                videoUrl = `http://localhost:3030/api/projects/${entry.id}/media/${videoNode.artifacts.mediaUrl}`;
              }
            }

            const dagNodes = nodes.map((n) => ({
              id: n.id,
              stage: n.stage,
              title: n.title,
              parentId: n.parentId,
            }));

            return {
              ...entry,
              previewVideoUrl: videoUrl,
              dagNodes: dagNodes.length > 0 ? dagNodes : undefined,
            };
          } catch {
            return entry;
          }
        })
      );

      return enriched.sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
    } catch {
      return [];
    }
  }

  /**
   * Register or update a project in the central index
   */
  static async registerProject(
    projectRoot: string,
    project: ProjectRegistryInput,
    overrides?: {
      basePresetId?: string;
      styleOverrides?: Record<string, any>;
      additionalConstraints?: string[];
    }
  ): Promise<ProjectRegistryEntry> {
    await this.initialize();
    const resolvedPath = path.resolve(projectRoot);
    const list = await this.listRecentProjects();

    const existingIdx = list.findIndex(
      (p) => p.id === project.id || path.resolve(p.path) === resolvedPath
    );

    const now = Date.now();
    const entry: ProjectRegistryEntry = {
      id: project.id,
      name: project.name,
      path: resolvedPath,
      aspectRatio: project.aspectRatio || '9:16',
      fps: project.fps || 30,
      targetDurationSec: project.targetDurationSec || 30,
      lastOpenedAt: now,
      createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : now,
      basePresetId: overrides?.basePresetId ?? (existingIdx >= 0 ? list[existingIdx].basePresetId : 'liquid_glass'),
      styleOverrides: overrides?.styleOverrides ?? (existingIdx >= 0 ? list[existingIdx].styleOverrides : {}),
      additionalConstraints: overrides?.additionalConstraints ?? (existingIdx >= 0 ? list[existingIdx].additionalConstraints : []),
    };

    if (existingIdx >= 0) {
      list[existingIdx] = entry;
    } else {
      list.unshift(entry);
    }

    await fs.writeFile(this.getIndexFilePath(), JSON.stringify(list, null, 2), 'utf-8');
    return entry;
  }

  /**
   * Remove a project from the recent index (and optionally move directory to trash)
   */
  static async removeProject(idOrPath: string, moveToTrash = false): Promise<boolean> {
    await this.initialize();
    const list = await this.listRecentProjects();
    const resolvedPath = path.resolve(idOrPath);
    const target = list.find((p) => p.id === idOrPath || path.resolve(p.path) === resolvedPath);

    if (!target) return false;

    const filtered = list.filter((p) => p.id !== target.id);
    await fs.writeFile(this.getIndexFilePath(), JSON.stringify(filtered, null, 2), 'utf-8');

    if (moveToTrash && target.path) {
      try {
        // macOS trash utility or apple script
        await execAsync(`osascript -e 'tell application "Finder" to delete POSIX file "${target.path}"'`);
      } catch (err: any) {
        // Fallback: remove directory from disk if Finder trash command is unavailable
        console.warn(`Could not move ${target.path} to Trash via Finder: ${err?.message}. Removing via fs.rm...`);
        try {
          await fs.rm(target.path, { recursive: true, force: true });
        } catch (rmErr: any) {
          console.error(`Failed to delete ${target.path} from disk:`, rmErr);
        }
      }
    }

    return true;
  }

  /**
   * Find project entry by ID or path
   */
  static async getProjectEntry(idOrPath: string): Promise<ProjectRegistryEntry | null> {
    const list = await this.listRecentProjects();
    const resolved = path.resolve(idOrPath);
    return list.find((p) => p.id === idOrPath || path.resolve(p.path) === resolved) || null;
  }

  /**
   * Pick a directory using macOS native Finder dialog via osascript
   */
  static async pickDirectoryNative(): Promise<string | null> {
    if (process.platform !== 'darwin') {
      return null;
    }
    try {
      const script = `osascript -e 'POSIX path of (choose folder with prompt "Select Video Project Directory:")'`;
      const { stdout } = await execAsync(script);
      const chosen = stdout.trim();
      return chosen.length > 0 ? chosen : null;
    } catch {
      // User pressed Cancel in Finder dialog
      return null;
    }
  }

  /**
   * List all global style presets
   */
  static async listStylePresets(): Promise<GlobalStylePreset[]> {
    await this.initialize();
    const presetsDir = this.getPresetsDirPath();
    try {
      const files = await fs.readdir(presetsDir);
      const presets: GlobalStylePreset[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(presetsDir, file), 'utf-8');
            presets.push(JSON.parse(content));
          } catch {
            // Ignore malformed preset
          }
        }
      }
      return presets.sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return DEFAULT_STYLE_PRESETS;
    }
  }

  /**
   * Get single global style preset
   */
  static async getStylePreset(presetId: string): Promise<GlobalStylePreset | null> {
    const presets = await this.listStylePresets();
    return presets.find((p) => p.id === presetId) || null;
  }

  /**
   * Save or update a global style preset
   */
  static async saveStylePreset(preset: GlobalStylePreset): Promise<GlobalStylePreset> {
    await this.initialize();
    const presetsDir = this.getPresetsDirPath();
    const safeId = preset.id.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const toSave: GlobalStylePreset = {
      ...preset,
      id: safeId,
      updatedAt: Date.now(),
    };
    await fs.writeFile(
      path.join(presetsDir, `${safeId}.json`),
      JSON.stringify(toSave, null, 2),
      'utf-8'
    );
    return toSave;
  }

  /**
   * Cascading Style Resolution:
   * Merges Global Preset (Base) + Local Overrides + Additional Constraints
   * Generates production-ready resolved tokens and compiled Markdown
   */
  static resolveCompositeStyle(
    basePreset: GlobalStylePreset | null,
    overrides?: Record<string, any>,
    additionalConstraints: string[] = []
  ): {
    tokens: Record<string, any>;
    markdown: string;
  } {
    const base = basePreset || DEFAULT_STYLE_PRESETS[0];

    // Deep merge tokens
    const mergedTokens = {
      archetype: overrides?.archetype || base.archetype,
      palette: {
        ...base.tokens.palette,
        ...(overrides?.palette || {}),
      },
      typography: {
        ...base.tokens.typography,
        ...(overrides?.typography || {}),
      },
      pacing: {
        ...base.tokens.pacing,
        ...(overrides?.pacing || {}),
      },
      motion: {
        ...base.tokens.motion,
        ...(overrides?.motion || {}),
        primaryMoves: Array.from(
          new Set([...(base.tokens.motion?.primaryMoves || []), ...(overrides?.motion?.primaryMoves || [])])
        ),
      },
      audioRules: {
        ...base.tokens.audioRules,
        ...(overrides?.audioRules || {}),
        sfxSignature: Array.from(
          new Set([...(base.tokens.audioRules?.sfxSignature || []), ...(overrides?.audioRules?.sfxSignature || [])])
        ),
      },
      negativeConstraints: Array.from(
        new Set([
          ...(base.tokens.negativeConstraints || []),
          ...(overrides?.negativeConstraints || []),
          ...additionalConstraints,
        ])
      ),
    };

    const markdown = `# PROJECT STYLE GUIDE (Cascading Resolved)

**Base Style Preset**: ${base.name} (${base.archetype})  
**Resolved At**: ${new Date().toISOString()}

### 1. Palette & Surface
- Background: \`${mergedTokens.palette.background}\`
- Card: \`${mergedTokens.palette.card}\`
- Accent: \`${mergedTokens.palette.accent}\`
- Text: \`${mergedTokens.palette.text}\`

### 2. Typography
- Display Font: \`${mergedTokens.typography.displayFont}\` (${mergedTokens.typography.headingCase})
- Body Font: \`${mergedTokens.typography.bodyFont}\`

### 3. Pacing & Rhythm
- Target Cut Cadence: ~${mergedTokens.pacing.avgCutDurationSec}s per cut
- Rhythm Mode: \`${mergedTokens.pacing.rhythm}\`
- Useful Pauses Allowed: ${mergedTokens.pacing.usefulPauses ? 'Yes' : 'No'}

### 4. Motion Rules
- Easing Curve: \`${mergedTokens.motion.easingCurve}\`
- Dynamic Overshoot: ${mergedTokens.motion.overshoot ? 'Enabled' : 'Disabled'}
- Signature Moves: ${mergedTokens.motion.primaryMoves.join(', ')}

### 5. Audio Mastering Rules
- Target Integrated Loudness: ${mergedTokens.audioRules.targetLufs} LUFS
- Dialogue Music Ducking: ${mergedTokens.audioRules.musicDuckingDb} dB
- Sound Effects: ${mergedTokens.audioRules.sfxSignature.join(', ')}

### 6. Negative Constraints & Quality Guards
${mergedTokens.negativeConstraints.map((rule: string) => `- ❌ ${rule}`).join('\n')}
`;

    return {
      tokens: mergedTokens,
      markdown,
    };
  }
}
