import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  BackgroundVariant,
} from '@xyflow/react';
import { CustomVersionNode } from './CustomVersionNode.js';
import { AgentCursorOverlay } from './AgentCursorOverlay.js';
import { FilmProject, AgentPresence } from '../../types.js';

interface VersionTreeCanvasProps {
  project: FilmProject;
  agents: AgentPresence[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onBranchNode: (nodeId: string) => void;
  onSetActiveCut: (sceneId: string, nodeId: string) => void;
  onMediaDrop: (nodeId: string, file: File) => void;
}

const nodeTypes = {
  customVersion: CustomVersionNode,
};

export const VersionTreeCanvas: React.FC<VersionTreeCanvasProps> = ({
  project,
  agents,
  selectedNodeId,
  onSelectNode,
  onBranchNode,
  onSetActiveCut,
  onMediaDrop,
}) => {
  // Convert project.nodes into ReactFlow Node array with layout positioning
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Group nodes by scene to lay them out horizontally across scenes, vertically across versions
    const sceneNodesMap: Record<string, string[]> = {};
    for (const node of Object.values(project.nodes)) {
      if (!sceneNodesMap[node.sceneId]) {
        sceneNodesMap[node.sceneId] = [];
      }
      sceneNodesMap[node.sceneId].push(node.id);
    }

    project.scenes.forEach((scene, sceneIndex) => {
      const nodeIds = sceneNodesMap[scene.id] || [];
      const xOffset = sceneIndex * 340 + 50;

      nodeIds.forEach((nodeId, versionIndex) => {
        const node = project.nodes[nodeId];
        const yOffset = versionIndex * 210 + 60;
        const isActiveCut = project.activeCut[node.sceneId] === node.id;
        const isSelected = selectedNodeId === node.id;

        flowNodes.push({
          id: node.id,
          type: 'customVersion',
          position: { x: xOffset, y: yOffset },
          data: {
            node,
            isActiveCut,
            isSelected,
            onSelect: onSelectNode,
            onBranch: onBranchNode,
            onSetActiveCut,
            onMediaDrop,
          },
        });

        if (node.parentId && project.nodes[node.parentId]) {
          const isEdgeInActiveCut =
            isActiveCut && project.activeCut[project.nodes[node.parentId].sceneId] === node.parentId;

          flowEdges.push({
            id: `e_${node.parentId}_${node.id}`,
            source: node.parentId,
            target: node.id,
            animated: isEdgeInActiveCut,
            style: {
              stroke: isEdgeInActiveCut ? '#F59E0B' : '#1F293D',
              strokeWidth: isEdgeInActiveCut ? 3 : 2,
            },
          });
        }
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [project, selectedNodeId, onSelectNode, onBranchNode, onSetActiveCut, onMediaDrop]);

  return (
    <div className="relative w-full h-full bg-[#0A0D14] overflow-hidden">
      <AgentCursorOverlay agents={agents} />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        className="bg-[#0A0D14]"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1F293D" />
        <Controls className="!bg-[#111726] !border-slate-800 !text-slate-200" />
        <MiniMap
          nodeColor={(n: any) => (n.data?.isActiveCut ? '#F59E0B' : '#1E293B')}
          maskColor="rgba(10, 13, 20, 0.75)"
          className="!bg-[#111726] !border-slate-800 rounded-lg overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
};
