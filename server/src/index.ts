import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import * as path from 'path';
import * as fs from 'fs/promises';
import chokidar from 'chokidar';
import { initializeSkills, SkillRegistry } from './skills/index.js';
import { ProjectService, FilmProject } from './services/projectService.js';
import { AgentManager } from './swarm/agentManager.js';
import { AGUIServerMessage, AGUIClientMessageSchema } from './protocol/aguiEvents.js';

const PORT = 3030;
const WORKSPACE_ROOT = process.cwd();

// Initialize all atomic skills
initializeSkills();

const server = Fastify({ logger: false });

await server.register(cors, { origin: true });
await server.register(websocket);

// Serve static project assets (video previews, audio files, images)
await server.register(fastifyStatic, {
  root: WORKSPACE_ROOT,
  prefix: '/media/',
  decorateReply: false,
});

// Connected WebSocket clients
const connectedClients = new Set<any>();

function broadcastAGUI(msg: AGUIServerMessage) {
  const payload = JSON.stringify(msg);
  for (const client of connectedClients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

// 1. Health Endpoint
server.get('/api/health', async () => {
  return {
    status: 'ok',
    version: '0.1.0',
    workspace: WORKSPACE_ROOT,
    skillsCount: SkillRegistry.list().length,
  };
});

// 2. Project State Endpoints
server.get('/api/project', async () => {
  return await ProjectService.loadProject(WORKSPACE_ROOT);
});

server.post('/api/project/init', async (req) => {
  const body = req.body as { name?: string };
  return await ProjectService.initProject(WORKSPACE_ROOT, body?.name || 'My AI Video Project');
});

// 3. Skills Endpoints
server.get('/api/skills', async () => {
  return SkillRegistry.list().map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    version: s.version,
  }));
});

server.post('/api/skills/execute', async (req, reply) => {
  const { skillId, input, targetNodeId, modelEngine } = req.body as {
    skillId: string;
    input: any;
    targetNodeId?: string;
    modelEngine?: any;
  };

  const project = await ProjectService.loadProject(WORKSPACE_ROOT);

  // Update agent status to working
  const agentId = modelEngine === 'claude-cli' ? 'claude-motion' : 'gemini-director';
  AgentManager.updatePresence(agentId, {
    status: 'thinking',
    activeNodeId: targetNodeId || null,
    activityMessage: `Executing skill ${skillId}...`,
  });

  broadcastAGUI({
    event: 'agent:presence',
    data: AgentManager.getPresence(agentId)!,
  });

  try {
    const result = await SkillRegistry.execute(skillId, input, {
      projectRoot: WORKSPACE_ROOT,
      modelEngine: modelEngine || 'gemini-cli',
      styleGuideMd: project.styleMarkdown,
      styleTokensJson: project.styleTokens,
      onStdoutChunk: (chunk) => {
        broadcastAGUI({
          event: 'agent:stream_delta',
          data: {
            sessionId: 'session_1',
            agentId,
            nodeId: targetNodeId || 'root',
            type: 'text',
            chunk,
            timestamp: Date.now(),
          },
        });
      },
      onThinking: (thought) => {
        broadcastAGUI({
          event: 'agent:stream_delta',
          data: {
            sessionId: 'session_1',
            agentId,
            nodeId: targetNodeId || 'root',
            type: 'thought',
            chunk: thought,
            timestamp: Date.now(),
          },
        });
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

    broadcastAGUI({
      event: 'agent:presence',
      data: AgentManager.getPresence(agentId)!,
    });

    return { success: true, result };
  } catch (err: any) {
    AgentManager.updatePresence(agentId, {
      status: 'error',
      activeNodeId: null,
      activityMessage: `Error: ${err.message}`,
    });

    broadcastAGUI({
      event: 'agent:presence',
      data: AgentManager.getPresence(agentId)!,
    });

    reply.status(500);
    return { success: false, error: err.message };
  }
});

// 4. DAG Version Tree Branching & Active Cut
server.post('/api/tree/branch', async (req) => {
  const { parentNodeId, versionLabel, prompt, modelEngine } = req.body as {
    parentNodeId: string;
    versionLabel: string;
    prompt: string;
    modelEngine?: any;
  };

  const project = await ProjectService.loadProject(WORKSPACE_ROOT);
  const newNode = await ProjectService.branchVersionNode(
    project,
    parentNodeId,
    versionLabel,
    prompt,
    modelEngine
  );

  return { success: true, node: newNode, project };
});

server.post('/api/tree/active-cut', async (req) => {
  const { sceneId, nodeId } = req.body as { sceneId: string; nodeId: string };
  const project = await ProjectService.loadProject(WORKSPACE_ROOT);
  await ProjectService.setActiveCutNode(project, sceneId, nodeId);

  broadcastAGUI({
    event: 'state:timeline_sync',
    data: {
      projectId: project.id,
      activeCut: project.activeCut,
      playheadSec: 0,
      isPlaying: false,
      updatedBy: 'user',
    },
  });

  return { success: true, activeCut: project.activeCut };
});

// 5. DaVinci Resolve Multi-Track Export
server.post('/api/export/davinci', async (req) => {
  const { fps = 30 } = (req.body as any) || {};
  const project = await ProjectService.loadProject(WORKSPACE_ROOT);

  // Collect clips from active cut
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

  // Add audio stem
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
    { projectRoot: WORKSPACE_ROOT }
  );

  // Write bundle files to exports/davinci_bundle/
  const bundleDir = path.join(WORKSPACE_ROOT, 'exports', 'davinci_bundle');
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

// 6. WebSocket AG-UI Protocol Gateway
server.get('/ws/ag-ui', { websocket: true }, (connection) => {
  connectedClients.add(connection);

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
          broadcastAGUI({
            event: 'state:timeline_sync',
            data: {
              projectId: 'active',
              activeCut: {},
              playheadSec: parsed.data.data.playheadSec,
              isPlaying: false,
              updatedBy: 'client',
            },
          });
        }
      }
    } catch {
      // Ignore invalid JSON
    }
  });

  connection.on('close', () => {
    connectedClients.delete(connection);
  });
});

// 7. Bi-Directional File Watcher
const watcher = chokidar.watch(
  [
    path.join(WORKSPACE_ROOT, 'raw_footage'),
    path.join(WORKSPACE_ROOT, 'references'),
    path.join(WORKSPACE_ROOT, 'assets'),
    path.join(WORKSPACE_ROOT, 'exports'),
  ],
  { ignoreInitial: true }
);

watcher.on('all', (event, filePath) => {
  const relative = path.relative(WORKSPACE_ROOT, filePath);
  broadcastAGUI({
    event: 'project:file_changed',
    data: {
      path: relative,
      changeType: event === 'add' ? 'add' : event === 'unlink' ? 'unlink' : 'change',
      timestamp: Date.now(),
    },
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
