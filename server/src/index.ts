import { importMedia, probeMedia } from './services/mediaService.js';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { containedPath } from './services/fileSafety.js';
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
import { runAntigravityCLIJson } from './runners/antigravityRunner.js';
import { runClaudeCLIJson } from './runners/claudeRunner.js';
import { runOllama } from './runners/ollamaRunner.js';
import { ProjectService, projectEvents, FilmProject, ProjectSubjectAnchor, SubjectVariant } from './services/projectService.js';
import { ProjectRegistry, GlobalStylePreset } from './services/projectRegistry.js';
import { VoiceService } from './services/voiceService.js';
import { BlenderBridge } from './bridges/blenderBridge.js';
import { AgentManager } from './swarm/agentManager.js';
import { AGUIServerMessage, AGUIClientMessageSchema } from './protocol/aguiEvents.js';

const PORT = Number(process.env.PORT || 3030);
const DEFAULT_WORKSPACE_ROOT = process.cwd();

// Initialize all atomic skills & central project registry
initializeSkills();
await ProjectRegistry.initialize();

const server = Fastify({ logger: false });

const sessionToken = randomBytes(32).toString('hex');
const allowedOrigins = new Set((process.env.STUDIO_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3030,http://127.0.0.1:3030').split(','));
await server.register(cors, { origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) });
server.addHook('onRequest', async (req, reply) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) return reply.code(403).send({ success: false, error: 'Origin is not allowed' });
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && req.headers['x-studio-token'] !== sessionToken) {
    return reply.code(401).send({ success: false, error: 'Studio session expired. Reload and try again.' });
  }
});
server.addHook('preHandler', async (req, reply) => {
 const expected=req.headers['x-project-revision'];
 if(expected===undefined || !['POST','PATCH','DELETE','PUT'].includes(req.method))return;
 const id=(req.params as any)?.id || (req.body as any)?.projectId;
 if(!id)return;
 const entry=await ProjectRegistry.getProjectEntry(id);if(!entry)return;
 const project=await ProjectService.loadProject(entry.path);
 if(Number(expected)!==(project.revision||0))return reply.code(409).send({success:false,error:'Project changed in another session. Reload before trying again.'});
});
server.get('/api/session', async (_req, reply) => {
  reply.header('Cache-Control', 'no-store');
  return { token: sessionToken };
});
server.setErrorHandler((error: any, _request, reply) => {
  const status = error instanceof z.ZodError ? 400 : error.statusCode || 500;
  reply.code(status).send({ success: false, error: error instanceof z.ZodError ? error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') : error.message });
});
await server.register(websocket);

// Dynamic static media serving for projects
await server.register(fastifyStatic, {
  root: DEFAULT_WORKSPACE_ROOT,
  prefix: '/media/',
  serve: false,
  decorateReply: true,
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

projectEvents.on('saved', (project: FilmProject) => broadcastAGUI({event:'project:updated',data:project} as any,project.id));

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
  if (!identifier) throw Object.assign(new Error('An explicit project ID is required'), { statusCode: 400 });
  const entry = await ProjectRegistry.getProjectEntry(identifier);
  if (!entry) throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  const project = await ProjectService.loadProject(entry.path);
  return { projectRoot: entry.path, project };
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
    reply.status(err.statusCode || 500);
    return { success: false, error: err.message };
  }
});

// Create new project with format presets & Genesis flow
server.post('/api/projects/create', async (req, reply) => {
  const {
    name,
    path: dirPath,
    preset = 'reel_9_16',
    aspectRatio,
    targetDurationSec,
    basePresetId = 'liquid_glass',
    ideaPrompt,
    emptyDAG = true,
    genesisConfig,
  } = z.object({name:z.string().trim().max(200).optional(),path:z.string().max(4096).optional(),preset:z.enum(['reel_9_16','youtube_16_9','ad_1_1']).optional(),aspectRatio:z.enum(['9:16','16:9','1:1','2.39:1']).optional(),targetDurationSec:z.number().positive().max(86400).optional(),basePresetId:z.string().optional(),ideaPrompt:z.string().optional(),emptyDAG:z.boolean().optional(),genesisConfig:z.object({modelEngine:z.enum(['antigravity-cli','claude-cli','ollama','external','hyperframes']).optional(),mood:z.string().optional(),customMood:z.string().optional(),directorDirective:z.string().optional(),referenceUrls:z.array(z.string()).optional(),customSpecs:z.string().optional(),branches:z.array(z.object({id:z.number(),title:z.string(),aesthetic:z.string(),customLook:z.string().optional(),beats:z.array(z.object({label:z.string(),text:z.string()})).optional()})).optional()}).optional()}).strict().parse(req.body);

  const projectName = (name && name.trim()) || 'Untitled Video Project';
  const sanitized = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'untitled_project';
  const defaultDir = path.join(
    process.env.HOME || process.env.USERPROFILE || '.',
    'Movies',
    'VS_Projects',
    sanitized
  );
  const targetDir = dirPath && dirPath.trim() ? dirPath.trim() : defaultDir;

  try {
    const resolvedPath = path.resolve(targetDir);
    await fs.mkdir(resolvedPath, { recursive: true });

    const project = await ProjectService.initProject(resolvedPath, projectName, {
      preset,
      aspectRatio,
      targetDurationSec,
      basePresetId,
      ideaPrompt,
      emptyDAG: Boolean(emptyDAG),
      genesisConfig,
      initGit: true,
    });

    ensureProjectWatcher(resolvedPath, project.id);
    return { success: true, project };
  } catch (err: any) {
    reply.status(err.statusCode || 500);
    return { success: false, error: err.message };
  }
});

// Real AI Mood & Tone Analysis for Genesis Flow
server.post('/api/ai/suggest-moods', async (req, reply) => {
  const { prompt, modelEngine = 'antigravity-cli' } = (req.body as any) || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    reply.status(400);
    return { success: false, error: 'A film premise prompt is required to analyze moods.' };
  }

  const aiPrompt = `You are an award-winning cinematic director and film composer.
Analyze this video film premise:
"${prompt.trim()}"

Extract and generate 4 distinct, highly tailored mood directions.
For each mood direction, provide:
- key: short lowercase identifier (e.g. "adrenaline", "contemplative", "kinetic", "noir")
- title: expressive title with an emoji (e.g. "⚡ Adrenaline & Speed")
- desc: 1-2 sentence description detailing the cut cadence, audio sound design/tempo, and camera lighting.
- isRecommended: boolean (true for the single best fit)

Return valid JSON with the exact structure:
{
  "moods": [
    {
      "key": "short_snake_case_key",
      "title": "Title with emoji",
      "desc": "1-2 sentence description of cut cadence, sound design, and lighting.",
      "isRecommended": boolean
    }
  ],
  "reasoning": "1 sentence explanation of the mood analysis"
}`;

  try {
    let resultData: any;
    if (modelEngine === 'claude-cli') {
      const res = await runClaudeCLIJson<{ moods: any[]; reasoning: string }>(aiPrompt, { timeoutMs: 45000 });
      resultData = res.data;
    } else if (modelEngine === 'ollama') {
      const res = await runOllama(aiPrompt, { timeoutMs: 45000 });
      const jsonMatch = res.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, res.text];
      resultData = JSON.parse(jsonMatch[1] || res.text);
    } else {
      // Default: Antigravity CLI
      const res = await runAntigravityCLIJson<{ moods: any[]; reasoning: string }>(aiPrompt, { timeoutMs: 45000 });
      resultData = res.data;
    }

    if (!resultData || !Array.isArray(resultData.moods) || resultData.moods.length === 0) {
      throw new Error('AI runner returned invalid mood structure.');
    }

    return {
      success: true,
      moods: resultData.moods,
      reasoning: resultData.reasoning || '',
    };
  } catch (err: any) {
    reply.status(502);
    return {
      success: false,
      error: `AI Mood Generation failed: ${err.message || 'Runner offline or timed out'}`,
    };
  }
});

server.post('/api/ai/story-directions', async (req, reply) => {
 const input=z.object({prompt:z.string().trim().min(1),duration:z.number().positive(),modelEngine:z.enum(['antigravity-cli','claude-cli','ollama']),mood:z.string().optional(),directive:z.string().optional()}).parse(req.body);
 const controller=new AbortController(); const cancel=()=>{if(!reply.raw.writableEnded)controller.abort();}; reply.raw.on('close',cancel);
 const prompt=`Create three distinct film directions for this brief: ${JSON.stringify(input)}. Each must fit the requested duration and brief. Return JSON {"directions":[{"title":"title","beats":[{"label":"beat with timing","text":"visual action and dialogue"}]}]}.`;
 try {
  const opts={timeoutMs:60000,signal:controller.signal};
  const raw=input.modelEngine==='claude-cli'?(await runClaudeCLIJson<any>(prompt,opts)).data:input.modelEngine==='ollama'?JSON.parse((await runOllama(prompt,opts)).text.replace(/```(?:json)?|```/g,'')):(await runAntigravityCLIJson<any>(prompt,opts)).data;
  const parsed=z.object({directions:z.array(z.object({title:z.string().min(1),beats:z.array(z.object({label:z.string(),text:z.string()})).min(1)})).min(1).max(5)}).parse(raw);
  return {success:true,directions:parsed.directions};
 } catch(error:any) {return reply.code(502).send({success:false,error:error.message || 'Generation failed. Retry or create a blank project.'});}
 finally{reply.raw.off('close',cancel);}
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

// Dynamic project media asset serving
server.get('/api/projects/:id/media/*', async (req, reply) => {
  const { id } = req.params as { id: string };
  const entry = await ProjectRegistry.getProjectEntry(id);
  if (!entry) {
    reply.status(404);
    return { error: 'Project not found' };
  }
  const relPath = (req.params as any)['*'];
  const fullPath = containedPath(entry.path, relPath);
  const realRoot = await fs.realpath(entry.path);
  containedPath(realRoot, await fs.realpath(fullPath));
  return reply.sendFile(path.basename(fullPath), path.dirname(fullPath));
});

// Update project settings, scenes, sticky notes, or metadata
server.patch('/api/projects/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const updates = z.object({
    revision: z.number().int().nonnegative().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    aspectRatio: z.enum(['9:16', '16:9', '1:1', '2.39:1']).optional(),
    targetDurationSec: z.number().positive().max(86400).optional(),
    fps: z.union([z.literal(24), z.literal(25), z.literal(29.97), z.literal(30), z.literal(60)]).optional(),
    scenes: z.array(z.object({ id: z.string().min(1), name: z.string(), order: z.number(), targetDurationSec: z.number().positive() })).optional(),
    edges: z.record(z.any()).optional(),
    nodes: z.record(z.object({ id: z.string(), parentId: z.string().nullable(), sceneId: z.string().nullable().optional(), artifacts: z.record(z.any()), metadata: z.record(z.any()) }).passthrough()).optional(),
    activeCut: z.record(z.string()).optional(), stickyNotes: z.array(z.object({ id: z.string(), text: z.string(), color: z.enum(['yellow','cyan','rose','emerald']), position: z.object({x:z.number(), y:z.number()}), isPinned:z.boolean().optional() })).optional(),
    activeSinkNodeId: z.string().nullable().optional(),
    styleMarkdown: z.string().optional(), basePresetId: z.string().optional(),
    styleOverrides: z.record(z.any()).optional(), additionalConstraints: z.array(z.string()).optional(),
  }).strict().parse(req.body);
  const { project } = await resolveProjectRoot(id);
  if (!project) return reply.code(404).send({ success: false, error: 'Project not found' });
  if (updates.revision !== undefined && updates.revision !== (project.revision || 0)) return reply.code(409).send({success:false,error:'Project changed. Reload before saving.'});
  Object.assign(project, updates);
  if (updates.scenes) {
    for (const scene of project.scenes) {
      if(!Object.values(project.nodes).some(node=>node.sceneId===scene.id)) {
        const nodeId=`node_${nanoid(8)}`;
        project.nodes[nodeId]={id:nodeId,parentId:null,sceneId:scene.id,title:scene.name,stage:'script',modelEngine:'external',prompt:'',versionLabel:'v1.0',artifacts:{},metadata:{createdAt:new Date().toISOString(),status:'idle'}};
        project.activeCut[scene.id]=nodeId;
      }
    }
  }
  if (updates.scenes && !updates.activeCut) project.activeCut=Object.fromEntries(Object.entries(project.activeCut).filter(([sceneId])=>project.scenes.some(scene=>scene.id===sceneId)));
  if(new Set(project.scenes.map(scene=>scene.id)).size!==project.scenes.length) throw Object.assign(new Error('Scene IDs must be unique'),{statusCode:400});
  for (const [id,node] of Object.entries(project.nodes)) {
    if(node.id!==id || (node.parentId && !project.nodes[node.parentId])) throw Object.assign(new Error('Invalid node identity or parent'),{statusCode:400});
    const visited=new Set<string>();let current:any=node;
    while(current){if(visited.has(current.id))throw Object.assign(new Error('The graph cannot contain cycles'),{statusCode:400});visited.add(current.id);current=project.nodes[current.parentId];}
  }
  for (const [sceneId, nodeId] of Object.entries(project.activeCut)) {
    if (!project.scenes.some(scene => scene.id === sceneId) || !project.nodes[nodeId]) throw Object.assign(new Error('Active cut contains an unknown scene or node'), { statusCode: 400 });
  }
  if (updates.basePresetId || updates.styleOverrides || updates.additionalConstraints) {
    const base = await ProjectRegistry.getStylePreset(project.basePresetId || 'liquid_glass');
    const resolved = ProjectRegistry.resolveCompositeStyle(base, project.styleOverrides || {}, project.additionalConstraints || []);
    project.styleTokens = resolved.tokens;
    project.styleMarkdown = updates.styleMarkdown || resolved.markdown;
  }

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
  const entry=await ProjectRegistry.getProjectEntry(id);
  const removed = await ProjectRegistry.removeProject(id, moveToTrash);
  if(removed && entry){await activeWatchers.get(entry.path)?.close();activeWatchers.delete(entry.path);for(const client of projectRooms.get(id)||[])client.close(1000,'Project removed');projectRooms.delete(id);}
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

  const controller=new AbortController();const cancel=()=>{if(!reply.raw.writableEnded)controller.abort();};reply.raw.on('close',cancel);
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
      signal:controller.signal,
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

    if(controller.signal.aborted) throw new Error('Job canceled');
    reply.raw.off('close',cancel);
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
    reply.raw.off('close',cancel);
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

    reply.status(err.statusCode || 500);
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

  return { success: true, activeCut: project.activeCut, project };
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
  const patch = z.object({ title:z.string().optional(), prompt:z.string().optional(), versionLabel:z.string().optional(), modelEngine:z.enum(['antigravity-cli','claude-cli','ollama','hyperframes','external']).optional(), artifacts:z.record(z.any()).optional(), metadata:z.record(z.any()).optional(), colorTag:z.string().optional(), width:z.number().positive().optional(), position:z.object({x:z.number(),y:z.number()}).optional(), shotContextOverrides:z.record(z.any()).optional(), vfxMetadata:z.record(z.any()).optional(), assetMetadata:z.record(z.any()).optional() }).strict().parse(req.body);
  const { project } = await resolveProjectRoot(id);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }
  const updatedNode = await ProjectService.updateNode(project, nodeId, patch as any);
  return { success: true, node: updatedNode, project };
});

// ==========================================
// 6. DaVinci Resolve Multi-Track Export
// ==========================================
server.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: 512 * 1024 * 1024 }, (_req, body, done) => done(null, body));
server.post('/api/projects/:id/nodes/:nodeId/media', { bodyLimit: 512 * 1024 * 1024 }, async (req, reply) => {
  const {id,nodeId} = req.params as {id:string;nodeId:string};
  const query = z.object({filename:z.string().min(1),start:z.coerce.number().nonnegative(),duration:z.coerce.number().positive()}).parse(req.query);
  const {project,projectRoot} = await resolveProjectRoot(id);
  if (!project?.nodes[nodeId]) return reply.code(404).send({success:false,error:'Node not found'});
  if (!Buffer.isBuffer(req.body) || !req.body.length) return reply.code(400).send({success:false,error:'A media file is required'});
  const media = await importMedia(projectRoot,req.body,query.filename,query.start,query.duration);
  const fresh = await ProjectService.loadProject(projectRoot);
  const node = fresh.nodes[nodeId];
  if (!node) return reply.code(409).send({success:false,error:'Node was deleted during import. Original media was retained.'});
  node.artifacts = {...node.artifacts, [media.hasVideo || media.image ? 'mediaUrl':'audioUrl']:media.relative, metadata:{...node.artifacts.metadata,sourceFile:media.source,durationSec:media.duration,waveform:media.waveform}};
  node.metadata.status = 'ready';
  await ProjectService.saveProject(fresh);
  return {success:true,project:fresh,node};
});

server.post('/api/export/davinci', async (req, reply) => {
  const { projectId, fps: requestedFps, revision } = z.object({projectId:z.string().min(1), fps:z.number().optional(), revision:z.number().optional()}).parse(req.body);
  const { projectRoot, project } = await resolveProjectRoot(projectId);
  if (!project) return reply.code(404).send({success:false,error:'Project not found'});
  if (revision !== undefined && revision !== (project.revision || 0)) return reply.code(409).send({success:false,error:'Project changed. Reload before export.'});
  const fps = requestedFps || project.fps;
  const clips: any[] = [];
  const sources: Array<{source:string;relative:string}> = [];
  const missing: string[] = [];
  let currentTime=0;
  const add = async (relative:string|undefined, scene:any, track:string, duration:number, text?:string) => {
    if (!relative) { if(track==='V1_footage') missing.push(`${scene.name}: select a take with imported video`); return; }
    try {
      const source=containedPath(projectRoot,relative);
      containedPath(await fs.realpath(projectRoot),await fs.realpath(source));
      const info = await probeMedia(source);
      if ((track==='V1_footage' && !info.hasVideo) || info.duration + 1/fps < duration) { missing.push(`${scene.name}: media is shorter than the scene or has no video`);return; }
      const filename=`${sources.length+1}_${path.basename(relative)}`;
      const bundled=`${track}/${filename}`;
      sources.push({source,relative:bundled});
      clips.push({id:`clip_${sources.length}`,name:scene.name,relativeFilePath:bundled,startSec:currentTime,durationSec:duration,track,text,hasAudio:info.hasAudio});
    } catch { missing.push(`${scene.name}: missing ${relative}`); }
  };
  for (const scene of project.scenes) {
    const node=project.nodes[project.activeCut[scene.id]];
    await add(node?.artifacts.mediaUrl,scene,'V1_footage',scene.targetDurationSec);
    await add(node?.artifacts.alphaOverlayUrl,scene,'V2_overlay',scene.targetDurationSec);
    await add(node?.artifacts.audioUrl,scene,'A1_dialogue',scene.targetDurationSec,node?.artifacts.metadata?.transcript);
    currentTime+=scene.targetDurationSec;
  }
  if (!project.scenes.length || missing.length) return reply.code(422).send({success:false,error:missing.join('; ') || 'Add at least one scene before exporting'});
  const dimensions:Record<string,[number,number]>={'9:16':[1080,1920],'16:9':[1920,1080],'1:1':[1080,1080],'2.39:1':[1920,804]};
  const [width,height]=dimensions[project.aspectRatio] || dimensions['16:9'];
  const result:any=await SkillRegistry.execute('skill-fcpxml-builder',{projectName:project.name,totalDurationSec:currentTime,fps,width,height,clips},{projectRoot});
  const bundleDir=path.join(projectRoot,'exports',`davinci_${Date.now()}_${nanoid(4)}`);
  const staging=`${bundleDir}.tmp`;
  try {
    await fs.mkdir(staging,{recursive:true});
    for (const file of sources) { const destination=path.join(staging,file.relative);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(file.source,destination); }
    await fs.writeFile(path.join(staging,'timeline.fcpxml'),result.fcpxmlContent);
    await fs.writeFile(path.join(staging,'timeline.edl'),result.edlContent);
    if(result.srtContent) await fs.writeFile(path.join(staging,'subtitles.srt'),result.srtContent);
    await fs.writeFile(path.join(staging,'STYLE_GUIDE.md'),project.styleMarkdown);
    await fs.writeFile(path.join(staging,'manifest.json'),JSON.stringify({projectId,revision:project.revision||0,fps,width,height,clips},null,2));
    await fs.rename(staging,bundleDir);
  } catch(error) { await fs.rm(staging,{recursive:true,force:true});throw error; }
  return {success:true,bundlePath:bundleDir,totalDurationSec:currentTime,clipCount:clips.length,instructions:result.instructions};
});

// 6b. Blender Scene Assembly Export
server.post('/api/export/blender', async (req, reply) => {
  const { projectId } = req.body as { projectId: string };
  const { project, projectRoot } = await resolveProjectRoot(projectId);
  if (!project) {
    reply.status(404);
    return { success: false, error: 'Project not found' };
  }

  const exportResult = await BlenderBridge.exportBlenderBundle(projectRoot, {
    fps: project.fps || 30,
    aspectRatio: project.aspectRatio || '9:16',
  });

  return {
    success: true,
    ...exportResult,
    instructions: `Execute in terminal: ${exportResult.cliCommand} or open scene_assembly.py inside Blender and click Run Script.`,
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
      metadata: {...node.artifacts.metadata, transcript: dialogueText, durationSec: result.durationSec},
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
  if (query.token !== sessionToken) { connection.close(1008, 'Invalid session'); return; }
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
