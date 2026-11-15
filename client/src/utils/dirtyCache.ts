import { UniversalGraphNode, GraphEdge } from '../types.js';

/**
 * Computes a deterministic FNV-1a 32-bit hash string for fast browser runtime execution,
 * or formats for crypto SHA-256 where available.
 */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

/**
 * Computes a deterministic hash of a node's configuration, parameters, and inputs.
 */
export function computeNodeConfigHash(
  node: UniversalGraphNode,
  incomingEdgeHashes: string[] = []
): string {
  const payload = {
    id: node.id,
    type: node.type || node.stage,
    prompt: node.prompt || '',
    config: node.config || {},
    inputPorts: Object.keys(node.inputPorts || {}).sort(),
    outputPorts: Object.keys(node.outputPorts || {}).sort(),
    incomingHashes: [...incomingEdgeHashes].sort(),
  };

  return hashString(JSON.stringify(payload));
}

/**
 * Propagates dirty state downstream from a modified node.
 * Leaves upstream and unaffected sibling nodes untouched.
 */
export function propagateDirtyState(
  modifiedNodeId: string,
  nodes: Record<string, UniversalGraphNode>,
  edges: Record<string, GraphEdge>
): {
  updatedNodes: Record<string, UniversalGraphNode>;
  dirtiedNodeIds: string[];
} {
  const updatedNodes = { ...nodes };
  const dirtiedNodeIds: string[] = [];

  // Build adjacency list for downstream traversal
  const downstreamAdj: Record<string, string[]> = {};
  for (const edge of Object.values(edges)) {
    if (!downstreamAdj[edge.sourceNodeId]) {
      downstreamAdj[edge.sourceNodeId] = [];
    }
    downstreamAdj[edge.sourceNodeId].push(edge.targetNodeId);
  }

  // BFS / DFS queue starting at modified node
  const queue = [modifiedNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    dirtiedNodeIds.push(current);

    if (updatedNodes[current]) {
      updatedNodes[current] = {
        ...updatedNodes[current],
        isDirty: true,
      };
    }

    const nextTargets = downstreamAdj[current] || [];
    for (const next of nextTargets) {
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }

  return {
    updatedNodes,
    dirtiedNodeIds,
  };
}

/**
 * Validates whether a node has valid cached output artifacts matching its current inputs.
 */
export function isNodeExecutionCached(
  nodeId: string,
  currentHash: string,
  cacheManifest: Record<string, { hash: string; artifactUri: string }>
): boolean {
  const entry = cacheManifest[nodeId];
  if (!entry) return false;
  return entry.hash === currentHash && Boolean(entry.artifactUri);
}
