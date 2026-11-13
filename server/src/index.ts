import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import * as path from 'path';
import * as fs from 'fs/promises';
import chokidar, { FSWatcher } from 'chokidar';
import { nanoid } from 'nanoid';
import {
  initializeSkills,
  SkillRegistry,
  CREATIVE_SKILLS_CATALOG,
  enrichPromptWithCreativeSkills,
  generateEarshotAudioCues,
  generateCookMontageRecipe,
} from './skills/index.js';
import { ProjectService, FilmProject, ProjectSubjectAnchor, SubjectVariant } from './services/projectService.js';
import { ProjectRegistry, GlobalStylePreset } from './services/projectRegistry.js';
import { VoiceService } from './services/voiceService.js';
import { AgentManager } from './swarm/agentManager.js';
import { AGUIServerMessage, AGUIClientMessageSchema } from './protocol/aguiEvents.js';

const PORT = 3030;
const DEFAULT_WORKSPACE_ROOT = process.cwd();

// Initialize all atomic skills & central project registry
initializeSkills();
await ProjectRegistry.initialize();

const server = Fastify({ logger: false });

await server.register(cors, { origin: true });
await server.register(websocket);

// Dynamic static media serving for projects
await server.register(fastifyStatic, {
  root: DEFAULT_WORKSPACE_ROOT,
  prefix: '/media/',
  decorateReply: false,
});

// Map of projectId -> Set of WebSocket client connections
const projectRooms = new Map<string, Set<any>>();
const globalClients = new Set<any>();

function addClientToRoom(projectId: string, client: any) {
  if (!projectRooms.has(projectId)) {
    projectRooms.set(projectId, new Set());
  }
  projectRooms.get(projectId)!.add(client);
}

function removeClientFromRoom(projectId: string, client: any) {
  const room = projectRooms.get(projectId);
  if (room) {
    room.delete(client);
    if (room.size === 0) {
      projectRooms.delete(projectId);
    }
  }
  globalClients.delete(client);
}

function broadcastAGUI(msg: AGUIServerMessage, targetProjectId?: string) {
  const payload = JSON.stringify(msg);

  // Broadcast to global listeners
  for (const client of globalClients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }

  // Broadcast to project-specific room
  if (targetProjectId && projectRooms.has(targetProjectId)) {
    for (const client of projectRooms.get(targetProjectId)!) {
      if (client.readyState === 1 && !globalClients.has(client)) {
        client.send(payload);
      }
    }
  }
}

// Active project file watchers: projectRoot -> FSWatcher
const activeWatchers = new Map<string, FSWatcher>();

function ensureProjectWatcher(projectRoot: string, projectId: string) {
  if (activeWatchers.has(projectRoot)) return;

  const watcher = chokidar.watch(
    [
      path.join(projectRoot, 'raw_footage'),
      path.join(projectRoot, 'references'),
      path.join(projectRoot, 'assets'),
      path.join(projectRoot, 'exports'),
    ],
    { ignoreInitial: true }
  );

  watcher.on('all', (event, filePath) => {
    const relative = path.relative(projectRoot, filePath);
    broadcastAGUI(
      {
        event: 'project:file_changed',
        data: {
          path: relative,
          changeType: event === 'add' ? 'add' : event === 'unlink' ? 'unlink' : 'change',
          timestamp: Date.now(),
        },
      },
      projectId
    );
  });

  activeWatchers.set(projectRoot, watcher);
}

/**
 * Resolves the absolute project root from request params / query / body
 */
async function resolveProjectRoot(identifier?: string): Promise<{ projectRoot: string; project?: FilmProject }> {
  if (!identifier) {
    // Default to most recent project or current working directory
    const recents = await ProjectRegistry.listRecentProjects();
    if (recents.length > 0) {
      const first = recents[0];
      try {
        const project = await ProjectService.loadProject(first.path);
        return { projectRoot: first.path, project };
      } catch {
        // Fall back to default workspace
      }
    }
    const project = await ProjectService.loadProject(DEFAULT_WORKSPACE_ROOT);
    return { projectRoot: DEFAULT_WORKSPACE_ROOT, project };
  }

  // Check if identifier is an existing entry in the registry
  const entry = await ProjectRegistry.getProjectEntry(identifier);
  if (entry) {
    const project = await ProjectService.loadProject(entry.path);
    return { projectRoot: entry.path, project };
  }

  // Check if identifier is an absolute path on disk
  try {
    const resolved = path.resolve(identifier);
    const project = await ProjectService.loadProject(resolved);
    return { projectRoot: resolved, project };
  } catch {
    const project = await ProjectService.loadProject(DEFAULT_WORKSPACE_ROOT);
    return { projectRoot: DEFAULT_WORKSPACE_ROOT, project };
  }
}

// ==========================================
// 1. Health & Meta
// ==========================================
server.get('/api/health', async () => {
  return {
    status: 'ok',
    version: '0.2.0',
    workspace: DEFAULT_WORKSPACE_ROOT,
    skillsCount: SkillRegistry.list().length,
  };
});

// ==========================================
// 2. Project Manager & Multi-Project Hub
// ==========================================

// List recent projects
server.get('/api/projects', async () => {
  return await ProjectRegistry.listRecentProjects();
});

// Trigger native macOS Finder folder picker
server.post('/api/projects/pick-directory', async () => {
  const chosenPath = await ProjectRegistry.pickDirectoryNative();
  return { path: chosenPath };
});

// Open existing directory as project
server.post('/api/projects/open', async (req, reply) => {
  const { path: dirPath } = (req.body as any) || {};
  if (!dirPath) {
    reply.status(400);
    return { success: false, error: 'Directory path is required' };
  }

  try {
    const resolvedPath = path.resolve(dirPath);
    const project = await ProjectService.loadProject(resolvedPath);
    ensureProjectWatcher(resolvedPath, project.id);

    return { success: true, project };
  } catch (err: any) {
    reply.status(500);
    return { success: false, error: err.message };
  }
});

// Create new project with format presets
server.post('/api/projects/create', async (req, reply) => {
  const {
    name,
    path: dirPath,
    preset = 'reel_9_16',
    aspectRatio,
    targetDurationSec,
    basePresetId = 'liquid_glass',
    ideaPrompt,
    emptyDAG = false,
  } = (req.body as any) || {};

  if (!name || !dirPath) {
    reply.status(400);
    return { success: false, error: 'Name and directory path are required' };
  }

  try {
    const resolvedPath = path.resolve(dirPath);
    const project = await ProjectService.initProject(resolvedPath, name, {
      preset,
      aspectRatio,
      targetDurationSec,
      basePresetId,
      ideaPrompt,
      emptyDAG: Boolean(emptyDAG),
      initGit: true,
    });

    ensureProjectWatcher(resolvedPath, project.id);
    return { success: true, project };
  } catch (err: any) {
    reply.status(500);
    return { success: false, error: err.message };
  }
});

// Get specific project by ID or path
server.get('/api/projects/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }
  ensureProjectWatcher(project.projectRoot, project.id);
  return project;
});

// Update project settings, scenes, sticky notes, or metadata
server.patch('/api/projects/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const updates = (req.body as any) || {};
  const { project } = await resolveProjectRoot(id);

  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  if (updates.name !== undefined) project.name = updates.name;
  if (updates.aspectRatio !== undefined) project.aspectRatio = updates.aspectRatio;
  if (updates.targetDurationSec !== undefined) project.targetDurationSec = Number(updates.targetDurationSec);
  if (updates.fps !== undefined) project.fps = Number(updates.fps);
  if (updates.scenes !== undefined) project.scenes = updates.scenes;
  if (updates.stickyNotes !== undefined) project.stickyNotes = updates.stickyNotes;
  if (updates.activeCut !== undefined) project.activeCut = updates.activeCut;
  if (updates.nodes !== undefined) project.nodes = updates.nodes;

  await ProjectService.saveProject(project);
  return { success: true, project };
});

// Add a new node directly to project DAG
server.post('/api/projects/:id/nodes', async (req, reply) => {
  const { id } = req.params as { id: string };
  const nodeData = (req.body as any) || {};
  const { project } = await resolveProjectRoot(id);

  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const nodeId = nodeData.id || `node_${nodeData.stage || 'node'}_${nanoid(6)}`;
  const stage = nodeData.stage || 'script';
  const newNode = {
    id: nodeId,
    parentId: nodeData.parentId || null,
    sceneId: nodeData.sceneId || project.scenes[0]?.id,
    stage,
    versionLabel: nodeData.versionLabel || 'v1.0',
    title: nodeData.title || `New ${stage.charAt(0).toUpperCase() + stage.slice(1)}`,
    modelEngine: nodeData.modelEngine || 'antigravity-cli',
    prompt: nodeData.prompt || '',
    position: nodeData.position || { x: 360, y: 180 },
    artifacts: nodeData.artifacts || {},
    metadata: {
      createdAt: new Date().toISOString(),
      status: 'idle',
      ...nodeData.metadata,
    },
  };

  project.nodes[nodeId] = newNode as any;
  await ProjectService.saveProject(project);
  return { success: true, node: newNode, project };
});

// Remove project from recent list (and optionally move to trash)
server.post('/api/projects/:id/remove', async (req) => {
  const { id } = req.params as { id: string };
  const { moveToTrash = false } = (req.body as any) || {};
  const removed = await ProjectRegistry.removeProject(id, moveToTrash);
  return { success: removed };
});

// Backward-compatible single-project endpoint
server.get('/api/project', async (req) => {
  const { projectId } = (req.query as any) || {};
  const { project } = await resolveProjectRoot(projectId);
  return project;
});

// ==========================================
// 3. Style Presets & Cascading Overrides
// ==========================================

// List all global style presets
server.get('/api/styles/presets', async () => {
  return await ProjectRegistry.listStylePresets();
});

// Save or create a global style preset
server.post('/api/styles/presets', async (req, reply) => {
  const preset = req.body as GlobalStylePreset;
  if (!preset || !preset.id || !preset.name) {
    reply.status(400);
    return { success: false, error: 'Valid style preset payload is required' };
  }
  const saved = await ProjectRegistry.saveStylePreset(preset);
  return { success: true, preset: saved };
});

// Resolve & apply cascading styles (Base Preset + Local Overrides + Extra Constraints)
server.post('/api/projects/:id/style/resolve', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { basePresetId, styleOverrides, additionalConstraints, applyToProject = true } =
    (req.body as any) || {};

  const { projectRoot, project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const basePreset = await ProjectRegistry.getStylePreset(basePresetId || project.basePresetId || 'liquid_glass');
  const resolved = ProjectRegistry.resolveCompositeStyle(
    basePreset,
    styleOverrides || project.styleOverrides || {},
    additionalConstraints || project.additionalConstraints || []
  );

  if (applyToProject) {
    project.basePresetId = basePresetId || project.basePresetId || 'liquid_glass';
    project.styleOverrides = styleOverrides || project.styleOverrides || {};
    project.additionalConstraints = additionalConstraints || project.additionalConstraints || [];
    project.styleMarkdown = resolved.markdown;
    project.styleTokens = resolved.tokens;
    await ProjectService.saveProject(project);
  }

  return { success: true, resolved, project };
});

// ==========================================
// 4. Skills Execution (Project-Scoped)
// ==========================================
server.get('/api/skills', async () => {
  return SkillRegistry.list().map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    version: s.version,
  }));
});

server.post('/api/skills/execute', async (req, reply) => {
  const { skillId, input, targetNodeId, modelEngine, projectId } = req.body as {
    skillId: string;
    input: any;
    targetNodeId?: string;
    modelEngine?: any;
    projectId?: string;
  };

  const { projectRoot, project } = await resolveProjectRoot(projectId);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  // Update agent status to working
  const agentId =
    modelEngine === 'claude-cli' ? 'claude-motion' : modelEngine === 'ollama' ? 'ollama-local' : 'agy-director';

  AgentManager.updatePresence(agentId, {
    status: 'thinking',
    activeNodeId: targetNodeId || null,
    activityMessage: `Executing skill ${skillId}...`,
  });

  broadcastAGUI(
    {
      event: 'agent:presence',
      data: AgentManager.getPresence(agentId)!,
    },
    project.id
  );

  try {
    const result = await SkillRegistry.execute(skillId, input, {
      projectRoot,
      modelEngine: modelEngine || 'antigravity-cli',
      styleGuideMd: project.styleMarkdown,
      styleTokensJson: project.styleTokens,
      onStdoutChunk: (chunk) => {
        broadcastAGUI(
          {
            event: 'agent:stream_delta',
            data: {
              sessionId: `session_${project.id}`,
              agentId,
              nodeId: targetNodeId || 'root',
              type: 'text',
              chunk,
              timestamp: Date.now(),
            },
          },
          project.id
        );
      },
      onThinking: (thought) => {
        broadcastAGUI(
          {
            event: 'agent:stream_delta',
            data: {
              sessionId: `session_${project.id}`,
              agentId,
              nodeId: targetNodeId || 'root',
              type: 'thought',
              chunk: thought,
              timestamp: Date.now(),
            },
          },
          project.id
        );
      },
    });

    // If a target node was specified, attach output artifacts
    if (targetNodeId && project.nodes[targetNodeId]) {
      const node = project.nodes[targetNodeId];
      if ((result as any).fullSpokenScript) {
        node.artifacts.textContent = (result as any).fullSpokenScript;
        node.artifacts.scriptBeats = (result as any).beats;
      }
      if ((result as any).styleMarkdown) {
        project.styleMarkdown = (result as any).styleMarkdown;
        project.styleTokens = (result as any).palette ? (result as Record<string, any>) : project.styleTokens;
      }
      node.metadata.status = 'ready';
      await ProjectService.saveProject(project);
    }

    AgentManager.updatePresence(agentId, {
      status: 'idle',
      activeNodeId: null,
      activityMessage: 'Task completed successfully',
    });

    broadcastAGUI(
      {
        event: 'agent:presence',
        data: AgentManager.getPresence(agentId)!,
      },
      project.id
    );

    return { success: true, result };
  } catch (err: any) {
    AgentManager.updatePresence(agentId, {
      status: 'error',
      activeNodeId: null,
      activityMessage: `Error: ${err.message}`,
    });

    broadcastAGUI(
      {
        event: 'agent:presence',
        data: AgentManager.getPresence(agentId)!,
      },
      project.id
    );

    reply.status(500);
    return { success: false, error: err.message };
  }
});

// Creative Suite Skills (Huashu Motion, Rossark Motion, Take-One, Reanimate, Argo, Explainroo, Video Director, Earshot, Cook)
server.get('/api/skills/creative-suite', async () => {
  return {
    success: true,
    skills: Object.values(CREATIVE_SKILLS_CATALOG),
  };
});

server.post('/api/skills/enrich-prompt', async (req) => {
  const { prompt, stage, activeSkillIds } = req.body as {
    prompt: string;
    stage: string;
    activeSkillIds?: string[];
  };
  const enriched = enrichPromptWithCreativeSkills(prompt || '', stage || 'shot', activeSkillIds || []);
  return {
    success: true,
    ...enriched,
  };
});

server.post('/api/skills/earshot/audio-cues', async (req) => {
  const { script } = req.body as { script: string };
  const cues = generateEarshotAudioCues(script || '');
  return {
    success: true,
    cues,
  };
});

server.post('/api/skills/cook/montage-recipe', async (req) => {
  const { projectName, durationSec, bpm } = req.body as {
    projectName: string;
    durationSec: number;
    bpm?: number;
  };
  const recipe = generateCookMontageRecipe(projectName || 'Video', durationSec || 30, bpm || 120);
  return {
    success: true,
    recipe,
  };
});

// ==========================================
// 5. DAG Version Tree Branching & Active Cut
// ==========================================
server.post('/api/tree/branch', async (req, reply) => {
  const { parentNodeId, versionLabel, prompt, modelEngine, projectId } = req.body as {
    parentNodeId: string;
    versionLabel: string;
    prompt: string;
    modelEngine?: any;
    projectId?: string;
  };

  const { project } = await resolveProjectRoot(projectId);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const newNode = await ProjectService.branchVersionNode(
    project,
    parentNodeId,
    versionLabel,
    prompt,
    modelEngine
  );

  return { success: true, node: newNode, project };
});

server.post('/api/tree/active-cut', async (req, reply) => {
  const { sceneId, nodeId, projectId } = req.body as {
    sceneId: string;
    nodeId: string;
    projectId?: string;
  };

  const { project } = await resolveProjectRoot(projectId);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  await ProjectService.setActiveCutNode(project, sceneId, nodeId);

  broadcastAGUI(
    {
      event: 'state:timeline_sync',
      data: {
        projectId: project.id,
        activeCut: project.activeCut,
        playheadSec: 0,
        isPlaying: false,
        updatedBy: 'user',
      },
    },
    project.id
  );

  return { success: true, activeCut: project.activeCut };
});

// Delete node from project DAG with child edge re-linking (and optional filesystem cleanup)
server.delete('/api/projects/:id/nodes/:nodeId', async (req, reply) => {
  const { id, nodeId } = req.params as { id: string; nodeId: string };
  const query = (req.query as any) || {};
  const body = (req.body as any) || {};
  const deleteFiles = Boolean(
    query.deleteFiles === 'true' || query.deleteFiles === true ||
    body.deleteFiles === 'true' || body.deleteFiles === true
  );

  const { project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }
  const updated = await ProjectService.deleteVersionNode(project, nodeId, deleteFiles);
  return { success: true, project: updated };
});

// Update node attributes (position, colorTag, title, overrides)
server.patch('/api/projects/:id/nodes/:nodeId', async (req, reply) => {
  const { id, nodeId } = req.params as { id: string; nodeId: string };
  const patch = req.body as any;
  const { project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }
  const updatedNode = await ProjectService.updateNode(project, nodeId, patch);
  return { success: true, node: updatedNode, project };
});

// ==========================================
// 6. DaVinci Resolve Multi-Track Export
// ==========================================
server.post('/api/export/davinci', async (req, reply) => {
  const { fps = 30, projectId } = (req.body as any) || {};
  const { projectRoot, project } = await resolveProjectRoot(projectId);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const clips: any[] = [];
  let currentTime = 0;

  for (const scene of project.scenes) {
    const activeNodeId = project.activeCut[scene.id];
    const node = project.nodes[activeNodeId];
    const duration = scene.targetDurationSec;

    clips.push({
      id: `clip_${scene.id}`,
      name: `${scene.name} (${node?.versionLabel || 'v1'})`,
      relativeFilePath: node?.artifacts.mediaUrl || `V1_footage/${scene.id}.mp4`,
      startSec: currentTime,
      durationSec: duration,
      track: 'V1_footage',
    });

    if (node?.artifacts.alphaOverlayUrl) {
      clips.push({
        id: `overlay_${scene.id}`,
        name: `${scene.name} Overlay`,
        relativeFilePath: node.artifacts.alphaOverlayUrl,
        startSec: currentTime,
        durationSec: duration,
        track: 'V2_overlay',
      });
    }

    currentTime += duration;
  }

  // Add dialogue stem
  clips.push({
    id: 'voice_master',
    name: 'Voiceover Dialogue Master',
    relativeFilePath: 'A1_dialogue/dialogue_master.wav',
    startSec: 0,
    durationSec: currentTime,
    track: 'A1_dialogue',
  });

  const exportResult: any = await SkillRegistry.execute(
    'skill-fcpxml-builder',
    {
      projectName: project.name,
      totalDurationSec: currentTime,
      fps: fps,
      width: project.aspectRatio === '9:16' ? 1080 : 1920,
      height: project.aspectRatio === '9:16' ? 1920 : 1080,
      clips,
    },
    { projectRoot }
  );

  const bundleDir = path.join(projectRoot, 'exports', 'davinci_bundle');
  await fs.mkdir(bundleDir, { recursive: true });

  await fs.writeFile(path.join(bundleDir, 'timeline.fcpxml'), exportResult.fcpxmlContent, 'utf-8');
  await fs.writeFile(path.join(bundleDir, 'timeline.edl'), exportResult.edlContent, 'utf-8');
  await fs.writeFile(path.join(bundleDir, 'subtitles.srt'), exportResult.srtContent, 'utf-8');
  await fs.writeFile(path.join(bundleDir, 'STYLE_GUIDE.md'), project.styleMarkdown, 'utf-8');

  return {
    success: true,
    bundlePath: bundleDir,
    totalDurationSec: currentTime,
    clipCount: clips.length,
    instructions: exportResult.instructions,
  };
});

// ==========================================
// 7. Project Subject Anchors & Asset Variants
// ==========================================

// List all project subject anchors
server.get('/api/projects/:id/subjects', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }
  return { success: true, subjects: project.subjectAnchors || [] };
});

// Create or update a subject anchor
server.post('/api/projects/:id/subjects', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { project, projectRoot } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const {
    id: subjectIdInput,
    name,
    category = 'character',
    coreDescription,
    variants,
    activeVariantId,
  } = (req.body as any) || {};

  if (!name || !coreDescription) {
    reply.status(400);
    return { success: false, error: 'Name and core description are required' };
  }

  project.subjectAnchors = project.subjectAnchors || [];
  const subjectId = subjectIdInput || `subj_${nanoid(6)}`;

  // Ensure assets/subjects/<subjectId> directory exists
  const subjectDir = path.join(projectRoot, 'assets', 'subjects', subjectId);
  await fs.mkdir(subjectDir, { recursive: true });

  const defaultVariant: SubjectVariant = {
    id: `var_${nanoid(6)}`,
    label: 'Default Visual',
    promptDescription: coreDescription,
    isDefault: true,
    createdAt: Date.now(),
  };

  const existingIndex = project.subjectAnchors.findIndex((s) => s.id === subjectId);
  if (existingIndex >= 0) {
    const existing = project.subjectAnchors[existingIndex];
    existing.name = name;
    existing.category = category;
    existing.coreDescription = coreDescription;
    if (variants && Array.isArray(variants)) {
      existing.variants = variants;
    }
    if (activeVariantId) {
      existing.activeVariantId = activeVariantId;
    }
    project.subjectAnchors[existingIndex] = existing;
  } else {
    const newAnchor: ProjectSubjectAnchor = {
      id: subjectId,
      name,
      category,
      coreDescription,
      variants: variants && variants.length > 0 ? variants : [defaultVariant],
      activeVariantId: activeVariantId || (variants && variants[0]?.id) || defaultVariant.id,
      createdAt: Date.now(),
    };
    project.subjectAnchors.push(newAnchor);
  }

  await ProjectService.saveProject(project);
  return { success: true, subjectId, subjects: project.subjectAnchors };
});

// Delete a subject anchor
server.delete('/api/projects/:id/subjects/:subjectId', async (req, reply) => {
  const { id, subjectId } = req.params as { id: string; subjectId: string };
  const { project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  project.subjectAnchors = (project.subjectAnchors || []).filter((s) => s.id !== subjectId);

  // Clean up any references in nodes
  for (const node of Object.values(project.nodes)) {
    if (node.boundSubjectAnchorIds) {
      node.boundSubjectAnchorIds = node.boundSubjectAnchorIds.filter((sid) => sid !== subjectId);
    }
  }

  await ProjectService.saveProject(project);
  return { success: true, subjects: project.subjectAnchors };
});

// Add or update a subject variant
server.post('/api/projects/:id/subjects/:subjectId/variants', async (req, reply) => {
  const { id, subjectId } = req.params as { id: string; subjectId: string };
  const { project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const subject = (project.subjectAnchors || []).find((s) => s.id === subjectId);
  if (!subject) {
    reply.status(404);
    return { success: false, error: 'Subject anchor not found' };
  }

  const { id: variantIdInput, label, promptDescription, mediaUrl, isDefault } = (req.body as any) || {};
  if (!label || !promptDescription) {
    reply.status(400);
    return { success: false, error: 'Variant label and prompt description are required' };
  }

  const variantId = variantIdInput || `var_${nanoid(6)}`;
  const variantIndex = subject.variants.findIndex((v) => v.id === variantId);

  if (isDefault) {
    subject.variants.forEach((v) => (v.isDefault = false));
    subject.activeVariantId = variantId;
  }

  if (variantIndex >= 0) {
    subject.variants[variantIndex] = {
      ...subject.variants[variantIndex],
      label,
      promptDescription,
      mediaUrl: mediaUrl || subject.variants[variantIndex].mediaUrl,
      isDefault: isDefault ?? subject.variants[variantIndex].isDefault,
    };
  } else {
    subject.variants.push({
      id: variantId,
      label,
      promptDescription,
      mediaUrl,
      isDefault: isDefault || subject.variants.length === 0,
      createdAt: Date.now(),
    });
    if (subject.variants.length === 1 || isDefault) {
      subject.activeVariantId = variantId;
    }
  }

  await ProjectService.saveProject(project);
  return { success: true, variantId, subject };
});

// Set active variant for a subject anchor
server.post('/api/projects/:id/subjects/:subjectId/active-variant', async (req, reply) => {
  const { id, subjectId } = req.params as { id: string; subjectId: string };
  const { activeVariantId } = (req.body as any) || {};
  const { project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const subject = (project.subjectAnchors || []).find((s) => s.id === subjectId);
  if (!subject) {
    reply.status(404);
    return { success: false, error: 'Subject anchor not found' };
  }

  const variant = subject.variants.find((v) => v.id === activeVariantId);
  if (!variant) {
    reply.status(400);
    return { success: false, error: 'Variant not found on subject' };
  }

  subject.activeVariantId = activeVariantId;
  await ProjectService.saveProject(project);
  return { success: true, subject };
});

// Bind subject anchors to a scene node
server.post('/api/projects/:id/nodes/:nodeId/subject-bindings', async (req, reply) => {
  const { id, nodeId } = req.params as { id: string; nodeId: string };
  const { subjectAnchorIds } = (req.body as any) || {};
  const { project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const node = project.nodes[nodeId];
  if (!node) {
    reply.status(404);
    return { success: false, error: 'Node not found' };
  }

  node.boundSubjectAnchorIds = Array.isArray(subjectAnchorIds) ? subjectAnchorIds : [];
  await ProjectService.saveProject(project);
  return { success: true, node };
});

// Update shot context overrides for a scene node
server.post('/api/projects/:id/nodes/:nodeId/shot-overrides', async (req, reply) => {
  const { id, nodeId } = req.params as { id: string; nodeId: string };
  const { overrides } = (req.body as any) || {};
  const { project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const node = project.nodes[nodeId];
  if (!node) {
    reply.status(404);
    return { success: false, error: 'Node not found' };
  }

  node.shotContextOverrides = {
    ...(node.shotContextOverrides || {}),
    ...(overrides || {}),
  };
  await ProjectService.saveProject(project);
  return { success: true, node };
});

// Synthesize rich contextual prompt for a scene node
server.post('/api/projects/:id/nodes/:nodeId/synthesize-prompt', async (req, reply) => {
  const { id, nodeId } = req.params as { id: string; nodeId: string };
  const { targetPlatform = 'runway' } = (req.body as any) || {};
  const { project, projectRoot } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const node = project.nodes[nodeId];
  if (!node) {
    reply.status(404);
    return { success: false, error: 'Node not found' };
  }

  // Derive scene timing and continuity
  const scene = project.scenes.find((s) => s.id === node.sceneId);
  const durationSec = scene?.targetDurationSec || 4;

  const sceneIndex = project.scenes.findIndex((s) => s.id === node.sceneId);
  let continuityContext = '';
  if (sceneIndex > 0) {
    const prevScene = project.scenes[sceneIndex - 1];
    continuityContext += `Incoming from ${prevScene.name}. `;
  }
  if (sceneIndex >= 0 && sceneIndex < project.scenes.length - 1) {
    const nextScene = project.scenes[sceneIndex + 1];
    continuityContext += `Transitioning into ${nextScene.name}.`;
  }

  // Collect bound subject anchors
  const boundAnchors = (project.subjectAnchors || [])
    .filter((a) => (node.boundSubjectAnchorIds || []).includes(a.id))
    .map((a) => {
      const activeVar = a.variants.find((v) => v.id === a.activeVariantId) || a.variants[0];
      return {
        id: a.id,
        name: a.name,
        coreDescription: a.coreDescription,
        variantLabel: activeVar?.label,
        variantDescription: activeVar?.promptDescription,
        mediaUrl: activeVar?.mediaUrl,
      };
    });

  const overrides = node.shotContextOverrides || {};

  const synthesisResult: any = await SkillRegistry.execute(
    'skill-prompt-synthesizer',
    {
      targetPlatform,
      shotConcept: node.prompt || node.title,
      aspectRatio: project.aspectRatio,
      durationSec,
      fps: project.fps,
      shotType: 'medium_shot',
      lensFocalLength: overrides.lensFocalLength || '35mm',
      aperture: overrides.aperture || 'f/1.8',
      cameraMovement: overrides.cameraMovement || 'slow_dolly_in',
      motionSpeed: overrides.motionSpeed || 'slow_cinematic',
      continuityContext: overrides.continuityNotes || continuityContext,
      spokenVoiceover: node.artifacts?.textContent,
      subjectAnchors: boundAnchors,
    },
    {
      projectRoot,
      styleGuideMd: project.styleMarkdown,
      styleTokensJson: project.styleTokens,
    }
  );

  // Update node with external fallback metadata
  node.externalFallback = {
    platform: targetPlatform,
    synthesizedPrompt: synthesisResult.copyableFullString,
    status: 'prompt_copied',
  };
  await ProjectService.saveProject(project);

  return { success: true, result: synthesisResult, node };
});

// List available offline voice presets (Zero API keys)
server.get('/api/voice/presets', async () => {
  return { success: true, presets: VoiceService.getPresets() };
});

// Synthesize real dialogue/voiceover audio for a node using local speech stack
server.post('/api/projects/:id/nodes/:nodeId/synthesize-voice', async (req, reply) => {
  const { id, nodeId } = req.params as { id: string; nodeId: string };
  const { text, voicePreset = 'narrator_daniel' } = (req.body as any) || {};
  const { project, projectRoot } = await resolveProjectRoot(id);

  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const node = project.nodes[nodeId];
  if (!node) {
    reply.status(404);
    return { success: false, error: 'Node not found' };
  }

  const dialogueText = text || node.artifacts?.textContent || node.prompt;
  if (!dialogueText || !dialogueText.trim()) {
    reply.status(400);
    return { success: false, error: 'Dialogue text is required for voice synthesis' };
  }

  try {
    const result = await VoiceService.synthesizeSpeech(
      projectRoot,
      nodeId,
      dialogueText,
      voicePreset
    );

    // Update node with newly synthesized audio artifact
    node.artifacts = {
      ...node.artifacts,
      textContent: dialogueText,
      audioUrl: result.audioRelPath,
      mediaUrl: result.audioRelPath,
    };
    node.metadata = {
      ...node.metadata,
      status: 'ready',
    };

    await ProjectService.saveProject(project);

    return {
      success: true,
      node,
      project,
      audioUrl: result.audioRelPath,
      durationSec: result.durationSec,
    };
  } catch (err: any) {
    reply.status(500);
    return { success: false, error: err.message || 'Voice synthesis failed' };
  }
});

// Set or clear the project Master Style Anchor (Pillar 2 of Style Parity)
server.post('/api/projects/:id/assets/master-style-anchor', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { assetUrl, nodeId } = (req.body as any) || {};
  const { project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  project.masterStyleAnchorAssetUrl = assetUrl;

  // If a specific node was marked, update its metadata
  for (const n of Object.values(project.nodes)) {
    if (n.assetMetadata) {
      n.assetMetadata.isMasterStyleAnchor = Boolean(nodeId && n.id === nodeId);
    }
  }

  await ProjectService.saveProject(project);
  return { success: true, masterStyleAnchorAssetUrl: project.masterStyleAnchorAssetUrl, project };
});

// Synthesize turnaround prompt for a subject asset with style parity lock
server.post('/api/projects/:id/assets/synthesize-turnaround', async (req, reply) => {
  const { id } = req.params as { id: string };
  const {
    subjectName,
    category = 'character',
    coreDescription,
    variantLabel = 'Turnaround Portrait',
    turnaroundAngle = 'portrait',
    targetPlatform = 'midjourney',
    subjectId,
    variantId,
  } = (req.body as any) || {};

  const { project, projectRoot } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const result: any = await SkillRegistry.execute(
    'skill-asset-generator',
    {
      subjectName,
      category,
      coreDescription,
      variantLabel,
      turnaroundAngle,
      masterStyleAnchorAssetUrl: project.masterStyleAnchorAssetUrl,
      targetPlatform,
      subjectId,
      variantId,
    },
    {
      projectRoot,
      styleGuideMd: project.styleMarkdown,
      styleTokensJson: project.styleTokens,
    }
  );

  return { success: true, result };
});

// Spawn a dedicated Asset Node on the 8-Stage DAG
server.post('/api/projects/:id/assets/spawn-node', async (req, reply) => {
  const { id } = req.params as { id: string };
  const {
    subjectName,
    coreDescription,
    variantLabel = 'v1.0 (Turnaround)',
    subjectAnchorId,
    mediaUrl,
  } = (req.body as any) || {};

  const { project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const anchorId = subjectAnchorId || `subj_${nanoid(6)}`;
  const nodeId = `node_asset_${nanoid(6)}`;

  // Find taste node if exists to use as parent
  const tasteNode = Object.values(project.nodes).find((n) => n.stage === 'taste');

  project.nodes[nodeId] = {
    id: nodeId,
    parentId: tasteNode ? tasteNode.id : null,
    stage: 'assets',
    stageOrder: 4,
    subjectAnchorId: anchorId,
    versionLabel: variantLabel,
    title: subjectName || 'New Subject Asset',
    modelEngine: 'antigravity-cli',
    prompt: coreDescription || 'Character turnaround description',
    assetMetadata: {
      isMasterStyleAnchor: !project.masterStyleAnchorAssetUrl, // First asset becomes anchor by default
      styleReferenceAssetUrl: project.masterStyleAnchorAssetUrl,
      turnaroundAngle: 'portrait',
    },
    artifacts: {
      textContent: coreDescription,
      mediaUrl,
    },
    metadata: {
      createdAt: new Date().toISOString(),
      status: mediaUrl ? 'ready' : 'idle',
    },
  };

  if (!project.masterStyleAnchorAssetUrl && mediaUrl) {
    project.masterStyleAnchorAssetUrl = mediaUrl;
  }

  await ProjectService.saveProject(project);
  return { success: true, node: project.nodes[nodeId], project };
});

// ==========================================
// 8. Multi-Tab Scoped WebSocket AG-UI Gateway
// ==========================================
server.get('/ws/ag-ui', { websocket: true }, (connection, req) => {
  const query = (req.query as any) || {};
  const projectId = query.projectId as string | undefined;

  if (projectId) {
    addClientToRoom(projectId, connection);
  } else {
    globalClients.add(connection);
  }

  // Send current agent presences on connect
  for (const presence of AgentManager.listPresences()) {
    connection.send(
      JSON.stringify({
        event: 'agent:presence',
        data: presence,
      })
    );
  }

  connection.on('message', async (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString('utf-8'));
      const parsed = AGUIClientMessageSchema.safeParse(msg);
      if (parsed.success) {
        if (parsed.data.event === 'timeline:scrub') {
          broadcastAGUI(
            {
              event: 'state:timeline_sync',
              data: {
                projectId: projectId || 'active',
                activeCut: {},
                playheadSec: parsed.data.data.playheadSec,
                isPlaying: false,
                updatedBy: 'client',
              },
            },
            projectId
          );
        }
      }
    } catch {
      // Ignore malformed JSON
    }
  });

  connection.on('close', () => {
    if (projectId) {
      removeClientFromRoom(projectId, connection);
    } else {
      globalClients.delete(connection);
    }
  });
});

// Start listening
try {
  await server.listen({ port: PORT, host: '127.0.0.1' });
  console.log(`[Video Studio Backend] Running on http://127.0.0.1:${PORT}`);
} catch (err) {
  console.error('[Video Studio Backend] Start failure:', err);
  process.exit(1);
}
