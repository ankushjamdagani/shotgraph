import { UniversalGraphNode, GraphEdge, TypedPortDefinition } from '../types.js';

export interface CompoundSubgraphDefinition {
  compoundNodeId: string;
  title: string;
  internalNodeIds: string[];
  internalEdgeIds: string[];
  exposedInputPorts: Record<string, TypedPortDefinition>;
  exposedOutputPorts: Record<string, TypedPortDefinition>;
}

/**
 * Collapses a set of selected node IDs into a single compound subgraph node.
 */
export function collapseNodesIntoSubgraph(
  selectedNodeIds: string[],
  nodes: Record<string, UniversalGraphNode>,
  edges: Record<string, GraphEdge>,
  compoundTitle = 'Compound Macro'
): {
  compoundNode: UniversalGraphNode;
  subgraphDef: CompoundSubgraphDefinition;
  updatedEdges: Record<string, GraphEdge>;
} {
  const selectedSet = new Set(selectedNodeIds);
  const compoundId = `compound_${Date.now()}`;

  // 1. Calculate centroid position for the compound node
  let avgX = 0;
  let avgY = 0;
  selectedNodeIds.forEach((id) => {
    avgX += nodes[id]?.position.x || 0;
    avgY += nodes[id]?.position.y || 0;
  });
  avgX = selectedNodeIds.length ? Math.round(avgX / selectedNodeIds.length) : 100;
  avgY = selectedNodeIds.length ? Math.round(avgY / selectedNodeIds.length) : 100;

  // 2. Identify internal vs crossing boundary edges
  const internalEdgeIds: string[] = [];
  const exposedInputPorts: Record<string, TypedPortDefinition> = {};
  const exposedOutputPorts: Record<string, TypedPortDefinition> = {};
  const updatedEdges: Record<string, GraphEdge> = {};

  for (const [edgeId, edge] of Object.entries(edges)) {
    const isSourceInternal = selectedSet.has(edge.sourceNodeId);
    const isTargetInternal = selectedSet.has(edge.targetNodeId);

    if (isSourceInternal && isTargetInternal) {
      internalEdgeIds.push(edgeId);
    } else if (!isSourceInternal && isTargetInternal) {
      // Inflow into compound node
      const portId = `in_${edge.targetNodeId}_${edge.targetPortId}`;
      exposedInputPorts[portId] = {
        id: portId,
        name: `In: ${nodes[edge.targetNodeId]?.title || 'Target'}`,
        type: 'story',
        schemaUri: 'urn:vs:subgraph-inflow:v1',
        direction: 'input',
      };
      // Rewire edge target to compound node
      updatedEdges[edgeId] = {
        ...edge,
        targetNodeId: compoundId,
        targetPortId: portId,
      };
    } else if (isSourceInternal && !isTargetInternal) {
      // Outflow from compound node
      const portId = `out_${edge.sourceNodeId}_${edge.sourcePortId}`;
      exposedOutputPorts[portId] = {
        id: portId,
        name: `Out: ${nodes[edge.sourceNodeId]?.title || 'Source'}`,
        type: 'media',
        schemaUri: 'urn:vs:subgraph-outflow:v1',
        direction: 'output',
      };
      // Rewire edge source to compound node
      updatedEdges[edgeId] = {
        ...edge,
        sourceNodeId: compoundId,
        sourcePortId: portId,
      };
    } else {
      // Unrelated edge remains untouched
      updatedEdges[edgeId] = edge;
    }
  }

  // 3. Construct compound node
  const compoundNode: UniversalGraphNode = {
    id: compoundId,
    type: 'compound.macro',
    title: compoundTitle,
    versionLabel: 'v1.0 (Macro)',
    position: { x: avgX, y: avgY },
    width: 320,
    inputPorts: exposedInputPorts,
    outputPorts: exposedOutputPorts,
    status: 'ready',
    data: {
      isCompound: true,
      containedNodeCount: selectedNodeIds.length,
    },
    artifacts: {
      metadata: {
        containedNodeIds: selectedNodeIds,
      },
    },
  };

  const subgraphDef: CompoundSubgraphDefinition = {
    compoundNodeId: compoundId,
    title: compoundTitle,
    internalNodeIds: selectedNodeIds,
    internalEdgeIds,
    exposedInputPorts,
    exposedOutputPorts,
  };

  return {
    compoundNode,
    subgraphDef,
    updatedEdges,
  };
}

/**
 * Computes a deterministic content hash of a node's config and inputs.
 */
export function computeNodeHash(node: UniversalGraphNode, upstreamHashes: string[] = []): string {
  const payload = JSON.stringify({
    type: node.type,
    title: node.title,
    prompt: node.prompt,
    overrides: node.shotContextOverrides,
    upstream: upstreamHashes.sort(),
  });

  // Fast DJB2 hash algorithm
  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash * 33) ^ payload.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}
