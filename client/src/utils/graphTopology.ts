import { GraphEdge, UniversalGraphNode, TypedPortDefinition, PortType } from '../types.js';

export const PORT_COLOR_MAP: Record<PortType, string> = {
  story: '#38BDF8',        // Sky
  style: '#EC4899',        // Pink
  spatial_3d: '#A855F7',   // Purple
  media: '#10B981',        // Emerald
  audio: '#F59E0B',        // Amber
  control_curve: '#EAB308',// Yellow
  code_spec: '#3B82F6',    // Blue
};

/**
 * Validates whether two ports are type-compatible for connection.
 */
export function arePortsCompatible(
  sourcePort?: TypedPortDefinition,
  targetPort?: TypedPortDefinition
): boolean {
  if (!sourcePort || !targetPort) return true; // Permissive if untyped legacy ports
  if (sourcePort.direction === targetPort.direction) return false; // Both input or both output
  if (sourcePort.type === targetPort.type) return true; // Direct type match

  // Permissive multi-modal conversions:
  // e.g. spatial_3d can feed into media (animatic), code_spec can take anything
  if (targetPort.type === 'code_spec') return true;
  return false;
}

/**
 * Creates standard typed port definitions for a given node type.
 */
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

/**
 * Checks whether adding a directed edge from sourceNodeId to targetNodeId
 * would introduce a cycle in the DAG.
 * Uses forward BFS from targetNodeId to sourceNodeId.
 */
export function wouldCreateCycle(
  sourceNodeId: string,
  targetNodeId: string,
  edges: Record<string, GraphEdge>
): boolean {
  if (sourceNodeId === targetNodeId) return true;

  // Build adjacency list: node -> outgoing targetNodeIds
  const adj = new Map<string, string[]>();
  for (const edge of Object.values(edges)) {
    if (!adj.has(edge.sourceNodeId)) {
      adj.set(edge.sourceNodeId, []);
    }
    adj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
  }

  // If sourceNodeId is already reachable from targetNodeId,
  // then targetNodeId -> ... -> sourceNodeId. Adding sourceNodeId -> targetNodeId creates a cycle.
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

/**
 * Computes topological sort of the graph using Kahn's algorithm.
 * Returns array of node IDs in execution order.
 */
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

/**
 * Traverses backward from activeSinkId to identify all ancestral active nodes ("The Red Thread").
 */
export function getActiveLineageNodeIds(
  activeSinkId: string,
  nodes: Record<string, UniversalGraphNode>,
  edges: Record<string, GraphEdge>
): string[] {
  if (!activeSinkId || !nodes[activeSinkId]) {
    return Object.keys(nodes);
  }

  // Map: targetNodeId -> array of sourceNodeIds
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

  // Return in topological order for clean sequential flow
  const topo = getTopologicalOrder(nodes, edges);
  return topo.filter((id) => activeSet.has(id));
}

/**
 * Identifies all nodes downstream from startNodeId (used for dirty cache invalidation).
 */
export function getDownstreamNodeIds(
  startNodeId: string,
  edges: Record<string, GraphEdge>
): string[] {
  const adj = new Map<string, string[]>();
  for (const edge of Object.values(edges)) {
    if (!adj.has(edge.sourceNodeId)) {
      adj.set(edge.sourceNodeId, []);
    }
    adj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
  }

  const downstream = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!downstream.has(next)) {
        downstream.add(next);
        queue.push(next);
      }
    }
  }

  return Array.from(downstream);
}
