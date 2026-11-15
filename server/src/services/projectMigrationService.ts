import {
  StudioProjectGraph,
  UniversalGraphNode,
  GraphEdge,
  getDefaultPortsForType,
  getActiveLineageNodeIds,
} from './graphEngine.js';

/**
 * Service to migrate projects from legacy v1/v2 schema to v3 Composable Typed Port Graph schema.
 */
export class ProjectMigrationService {
  /**
   * Migrates any loaded project JSON into a verified StudioProjectGraph (schemaVersion 3).
   */
  static migrateProjectV2toV3(rawProject: any): StudioProjectGraph {
    if (!rawProject) {
      throw new Error('Cannot migrate empty project data.');
    }

    // Already v3? Verify and return
    if (rawProject.schemaVersion === 3 && rawProject.edges) {
      return {
        ...rawProject,
        activePathNodeIds:
          rawProject.activePathNodeIds ||
          getActiveLineageNodeIds(
            rawProject.activeSinkNodeId,
            rawProject.nodes || {},
            rawProject.edges || {}
          ),
      };
    }

    const legacyNodes: Record<string, any> = rawProject.nodes || {};
    const nodes: Record<string, UniversalGraphNode> = {};
    const edges: Record<string, GraphEdge> = {};

    // 1. Upgrade each node to UniversalGraphNode with typed ports
    for (const [nodeId, legacyNode] of Object.entries(legacyNodes)) {
      const stage = legacyNode.stage || 'ideation';
      const nodeType = legacyNode.type || this.mapStageToNodeType(stage);
      const defaultPorts = getDefaultPortsForType(nodeType);

      nodes[nodeId] = {
        id: nodeId,
        type: nodeType,
        title: legacyNode.title || 'Untitled Node',
        versionLabel: legacyNode.versionLabel || 'v1.0',
        position: legacyNode.position || { x: 120, y: 120 },
        width: legacyNode.width || 320,
        height: legacyNode.height,
        inputPorts: legacyNode.inputPorts || defaultPorts.inputPorts,
        outputPorts: legacyNode.outputPorts || defaultPorts.outputPorts,
        data: legacyNode.data || {},
        artifacts: legacyNode.artifacts || {},
        status: legacyNode.metadata?.status || legacyNode.status || 'idle',
        hash: legacyNode.hash,
        isDirty: legacyNode.isDirty || false,
        // Preserve legacy contracts
        parentId: legacyNode.parentId || null,
        stage: stage,
        sceneId: legacyNode.sceneId,
        shotId: legacyNode.shotId,
        subjectAnchorId: legacyNode.subjectAnchorId,
        modelEngine: legacyNode.modelEngine,
        prompt: legacyNode.prompt,
        boundSubjectAnchorIds: legacyNode.boundSubjectAnchorIds || [],
        metadata: legacyNode.metadata || {
          createdAt: new Date().toISOString(),
          status: 'idle',
        },
      };
    }

    // 2. Synthesize explicit edges from parentId relationships
    for (const [nodeId, node] of Object.entries(nodes)) {
      if (node.parentId && nodes[node.parentId]) {
        const edgeId = `edge_${node.parentId}_to_${nodeId}`;
        const sourcePorts = Object.keys(nodes[node.parentId].outputPorts || {});
        const targetPorts = Object.keys(node.inputPorts || {});

        edges[edgeId] = {
          id: edgeId,
          sourceNodeId: node.parentId,
          sourcePortId: sourcePorts[0] || 'out_primary',
          targetNodeId: nodeId,
          targetPortId: targetPorts[0] || 'in_primary',
          type: 'primary',
        };
      }
    }

    // 3. Synthesize asset binding edges from boundSubjectAnchorIds
    for (const [nodeId, node] of Object.entries(nodes)) {
      if (node.boundSubjectAnchorIds && node.boundSubjectAnchorIds.length > 0) {
        for (const anchorId of node.boundSubjectAnchorIds) {
          // Find asset node for this anchor
          const assetNode = Object.values(nodes).find(
            (n) => n.subjectAnchorId === anchorId || n.id.includes(anchorId)
          );
          if (assetNode) {
            const edgeId = `edge_asset_${assetNode.id}_to_${nodeId}`;
            if (!edges[edgeId]) {
              edges[edgeId] = {
                id: edgeId,
                sourceNodeId: assetNode.id,
                sourcePortId: 'out_asset',
                targetNodeId: nodeId,
                targetPortId: 'in_asset',
                type: 'asset_binding',
              };
            }
          }
        }
      }
    }

    // 4. Identify active terminal sink node
    let activeSinkId = Object.keys(nodes).find((id) => nodes[id].stage === 'assembly');

    if (!activeSinkId) {
      // Find a terminal node (no outgoing edges)
      const nodesWithOutgoing = new Set(Object.values(edges).map((e) => e.sourceNodeId));
      const terminalCandidates = Object.keys(nodes).filter((id) => !nodesWithOutgoing.has(id));
      activeSinkId = terminalCandidates[terminalCandidates.length - 1] || Object.keys(nodes)[0] || '';
    }

    // 5. Trace active lineage
    const activePathNodeIds = getActiveLineageNodeIds(activeSinkId, nodes, edges);

    return {
      schemaVersion: 3,
      id: rawProject.id || 'proj_migrated',
      name: rawProject.name || 'Untitled Project',
      projectRoot: rawProject.projectRoot || '',
      nodes,
      edges,
      activeSinkNodeId: activeSinkId,
      activePathNodeIds,
      targetDurationSec: rawProject.targetDurationSec || 30,
      aspectRatio: rawProject.aspectRatio || '9:16',
      fps: rawProject.fps || 30,
      scenes: rawProject.scenes || [],
      activeCut: rawProject.activeCut || {},
      styleMarkdown: rawProject.styleMarkdown || '',
      styleTokens: rawProject.styleTokens || {},
      basePresetId: rawProject.basePresetId || 'liquid_glass',
      styleOverrides: rawProject.styleOverrides || {},
      additionalConstraints: rawProject.additionalConstraints || [],
      subjectAnchors: rawProject.subjectAnchors || [],
      stickyNotes: rawProject.stickyNotes || [],
    };
  }

  private static mapStageToNodeType(stage: string): string {
    switch (stage) {
      case 'ideation':
        return 'creative.idea';
      case 'taste':
        return 'director.taste';
      case 'script':
        return 'story.master_script';
      case 'assets':
        return 'asset.item';
      case 'shot':
      case 'storyboard':
        return 'cinematography.shot';
      case 'footage':
      case 'motion':
        return 'gen.video_take';
      case 'vfx':
        return 'vfx.overlay';
      case 'assembly':
      case 'render':
        return 'sink.video_assembly';
      default:
        return 'creative.idea';
    }
  }
}
