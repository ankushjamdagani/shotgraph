export type PortType =
  | 'story'
  | 'style'
  | 'spatial_3d'
  | 'media'
  | 'audio'
  | 'control_curve'
  | 'code_spec';

export interface TypedPortDefinition {
  id: string;
  name: string;
  type: PortType;
  schemaUri: string;
  direction: 'input' | 'output';
  allowMultiple?: boolean;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  type?: 'primary' | 'asset_binding' | 'effect_feed' | 'camera_control' | 'audio_sync';
}

export interface UniversalGraphNode<TData = any, TArtifacts = any> {
  id: string;
  type?: string;
  title: string;
  versionLabel: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  inputPorts?: Record<string, TypedPortDefinition>;
  outputPorts?: Record<string, TypedPortDefinition>;
  data?: TData;
  artifacts: TArtifacts;
  status?: 'idle' | 'generating' | 'ready' | 'error';
  hash?: string;
  isDirty?: boolean;
  parentId?: string | null;
  stage?: string;
  sceneId?: string;
  shotId?: string;
  subjectAnchorId?: string;
  modelEngine?: string;
  prompt?: string;
  boundSubjectAnchorIds?: string[];
  metadata?: {
    createdAt: string;
    status: 'idle' | 'generating' | 'ready' | 'error';
    errorLog?: string;
  };
}

export interface StudioProjectGraph {
  schemaVersion: 3;
  id: string;
  name: string;
  projectRoot: string;
  nodes: Record<string, UniversalGraphNode>;
  edges: Record<string, GraphEdge>;
  activeSinkNodeId: string;
  activePathNodeIds?: string[];
  targetDurationSec: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  fps: number;
  scenes: Array<{
    id: string;
    name: string;
    order: number;
    targetDurationSec: number;
  }>;
  activeCut: Record<string, string>;
  styleMarkdown: string;
  styleTokens: Record<string, any>;
  basePresetId?: string;
  styleOverrides?: Record<string, any>;
  additionalConstraints?: string[];
  subjectAnchors?: any[];
  stickyNotes?: any[];
}

export function getDefaultPortsForType(nodeType: string): {
  inputPorts: Record<string, TypedPortDefinition>;
  outputPorts: Record<string, TypedPortDefinition>;
} {
  const inputPorts: Record<string, TypedPortDefinition> = {};
  const outputPorts: Record<string, TypedPortDefinition> = {};

  const makePort = (
    id: string,
    name: string,
    type: PortType,
    direction: 'input' | 'output',
    schemaUri = 'urn:vs:standard:v1',
    allowMultiple = false
  ): TypedPortDefinition => ({
    id,
    name,
    type,
    schemaUri,
    direction,
    allowMultiple,
  });

  switch (nodeType) {
    case 'creative.idea':
    case 'ideation':
      outputPorts['out_story'] = makePort('out_story', 'Story Context', 'story', 'output', 'urn:vs:story:v1', true);
      break;

    case 'director.taste':
    case 'taste':
      inputPorts['in_story'] = makePort('in_story', 'Story In', 'story', 'input', 'urn:vs:story:v1');
      outputPorts['out_story'] = makePort('out_story', 'Story Out', 'story', 'output', 'urn:vs:story:v1', true);
      outputPorts['out_style'] = makePort('out_style', 'Style DNA', 'style', 'output', 'urn:vs:style:v1', true);
      break;

    case 'story.master_script':
    case 'script':
      inputPorts['in_story'] = makePort('in_story', 'Story In', 'story', 'input', 'urn:vs:story:v1');
      inputPorts['in_style'] = makePort('in_style', 'Style In', 'style', 'input', 'urn:vs:style:v1');
      outputPorts['out_story'] = makePort('out_story', 'Screenplay Beats', 'story', 'output', 'urn:vs:screenplay:v1', true);
      outputPorts['out_audio'] = makePort('out_audio', 'Spoken Stem', 'audio', 'output', 'urn:vs:audio-stem:v1', true);
      break;

    case 'story.scene_beat':
      inputPorts['in_story'] = makePort('in_story', 'Beat Context', 'story', 'input', 'urn:vs:screenplay:v1');
      inputPorts['in_style'] = makePort('in_style', 'Style In', 'style', 'input', 'urn:vs:style:v1');
      inputPorts['in_asset'] = makePort('in_asset', 'Bound Assets', 'spatial_3d', 'input', 'urn:vs:asset-bundle:v1', true);
      outputPorts['out_story'] = makePort('out_story', 'Scene Spec', 'story', 'output', 'urn:vs:scene-spec:v1', true);
      break;

    case 'cinematography.shot':
    case 'shot':
    case 'storyboard':
      inputPorts['in_story'] = makePort('in_story', 'Scene Beat', 'story', 'input', 'urn:vs:scene-spec:v1');
      inputPorts['in_asset'] = makePort('in_asset', 'Subject Anchor', 'spatial_3d', 'input', 'urn:vs:gltf-mesh:v2', true);
      outputPorts['out_shot'] = makePort('out_shot', 'Shot Framing', 'story', 'output', 'urn:vs:shot-spec:v1', true);
      outputPorts['out_spatial'] = makePort('out_spatial', 'Camera Rig', 'spatial_3d', 'output', 'urn:vs:camera-spline:v1', true);
      break;

    case 'previs.threejs':
      inputPorts['in_shot'] = makePort('in_shot', 'Shot Spec', 'story', 'input', 'urn:vs:shot-spec:v1');
      inputPorts['in_spatial'] = makePort('in_spatial', 'Camera Rig', 'spatial_3d', 'input', 'urn:vs:camera-spline:v1');
      inputPorts['in_audio'] = makePort('in_audio', 'Audio Sync', 'audio', 'input', 'urn:vs:audio-stem:v1');
      outputPorts['out_media'] = makePort('out_media', 'Animatic Video', 'media', 'output', 'urn:vs:video-stream:v1', true);
      outputPorts['out_spatial'] = makePort('out_spatial', 'Camera Matrix', 'spatial_3d', 'output', 'urn:vs:camera-matrix:v1', true);
      outputPorts['out_code'] = makePort('out_code', 'Blender / Three.js Code', 'code_spec', 'output', 'urn:vs:code-spec:v1', true);
      break;

    case 'gen.video_take':
    case 'footage':
    case 'motion':
      inputPorts['in_shot'] = makePort('in_shot', 'Shot Prompt', 'story', 'input', 'urn:vs:shot-spec:v1');
      inputPorts['in_spatial'] = makePort('in_spatial', 'Camera Matrix', 'spatial_3d', 'input', 'urn:vs:camera-matrix:v1');
      inputPorts['in_animatic'] = makePort('in_animatic', 'Animatic Reference', 'media', 'input', 'urn:vs:video-stream:v1');
      outputPorts['out_media'] = makePort('out_media', 'Rendered Take', 'media', 'output', 'urn:vs:video-stream:v1', true);
      break;

    case 'vfx.overlay':
    case 'vfx':
      inputPorts['in_media'] = makePort('in_media', 'Media Stream', 'media', 'input', 'urn:vs:video-stream:v1');
      outputPorts['out_media'] = makePort('out_media', 'Composited Media', 'media', 'output', 'urn:vs:video-stream:v1', true);
      break;

    case 'asset.item':
    case 'assets':
      outputPorts['out_asset'] = makePort('out_asset', 'Subject Geometry & Prompt', 'spatial_3d', 'output', 'urn:vs:gltf-mesh:v2', true);
      break;

    case 'sink.video_assembly':
    case 'assembly':
    case 'render':
      inputPorts['in_media'] = makePort('in_media', 'Video Takes', 'media', 'input', 'urn:vs:video-stream:v1', true);
      inputPorts['in_audio'] = makePort('in_audio', 'Audio Stems', 'audio', 'input', 'urn:vs:audio-stem:v1', true);
      outputPorts['out_timeline'] = makePort('out_timeline', 'Conformed Timeline', 'code_spec', 'output', 'urn:vs:fcpxml:v1', true);
      break;

    default:
      inputPorts['in_primary'] = makePort('in_primary', 'In', 'story', 'input', 'urn:vs:standard:v1', true);
      outputPorts['out_primary'] = makePort('out_primary', 'Out', 'story', 'output', 'urn:vs:standard:v1', true);
      break;
  }

  return { inputPorts, outputPorts };
}

export function wouldCreateCycle(
  sourceNodeId: string,
  targetNodeId: string,
  edges: Record<string, GraphEdge>
): boolean {
  if (sourceNodeId === targetNodeId) return true;

  const adj = new Map<string, string[]>();
  for (const edge of Object.values(edges)) {
    if (!adj.has(edge.sourceNodeId)) {
      adj.set(edge.sourceNodeId, []);
    }
    adj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
  }

  const queue = [targetNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === sourceNodeId) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);

    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }

  return false;
}

export function getTopologicalOrder(
  nodes: Record<string, UniversalGraphNode>,
  edges: Record<string, GraphEdge>
): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const nodeId of Object.keys(nodes)) {
    inDegree.set(nodeId, 0);
    adj.set(nodeId, []);
  }

  for (const edge of Object.values(edges)) {
    if (nodes[edge.sourceNodeId] && nodes[edge.targetNodeId]) {
      adj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [nodeId, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(nodeId);
    }
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    result.push(curr);

    for (const neighbor of adj.get(curr) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

export function getActiveLineageNodeIds(
  activeSinkId: string,
  nodes: Record<string, UniversalGraphNode>,
  edges: Record<string, GraphEdge>
): string[] {
  if (!activeSinkId || !nodes[activeSinkId]) {
    return Object.keys(nodes);
  }

  const incoming = new Map<string, string[]>();
  for (const edge of Object.values(edges)) {
    if (!incoming.has(edge.targetNodeId)) {
      incoming.set(edge.targetNodeId, []);
    }
    incoming.get(edge.targetNodeId)!.push(edge.sourceNodeId);
  }

  const activeSet = new Set<string>();
  const queue = [activeSinkId];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (activeSet.has(curr)) continue;
    activeSet.add(curr);

    const parents = incoming.get(curr) || [];
    for (const parent of parents) {
      if (!activeSet.has(parent) && nodes[parent]) {
        queue.push(parent);
      }
    }
  }

  const topo = getTopologicalOrder(nodes, edges);
  return topo.filter((id) => activeSet.has(id));
}
