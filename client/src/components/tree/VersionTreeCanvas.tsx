import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import { CustomVersionNode } from './CustomVersionNode.js';
import { AgentCursorOverlay } from './AgentCursorOverlay.js';
import { FilmProject, AgentPresence } from '../../types.js';
import {
  Lightbulb,
  Palette,
  FileText,
  User,
  Camera,
  Video,
  Wand2,
  Film,
} from 'lucide-react';

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

export const PIPELINE_STAGES = [
  { id: 'ideation', label: '1. Idea / Premise', icon: Lightbulb, color: '#F59E0B' },
  { id: 'taste', label: '2. Taste & Style', icon: Palette, color: '#EC4899' },
  { id: 'script', label: '3. Master Script', icon: FileText, color: '#3B82F6' },
  { id: 'assets', label: '4. Subject Assets', icon: User, color: '#8B5CF6' },
  { id: 'shot', label: '5. Shots & Framing', icon: Camera, color: '#06B6D4' },
  { id: 'footage', label: '6. Video Takes', icon: Video, color: '#10B981' },
  { id: 'vfx', label: '7. VFX & Overlays', icon: Wand2, color: '#F97316' },
  { id: 'assembly', label: '8. Master Assembly', icon: Film, color: '#38BDF8' },
];

function normalizeStage(stage: string): string {
  if (stage === 'storyboard') return 'shot';
  if (stage === 'motion' || stage === 'voice') return 'footage';
  if (stage === 'render') return 'assembly';
  return stage;
}

export const VersionTreeCanvas: React.FC<VersionTreeCanvasProps> = ({
  project,
  agents,
  selectedNodeId,
  onSelectNode,
  onBranchNode,
  onSetActiveCut,
  onMediaDrop,
}) => {
  // Convert project.nodes into 8-Stage Pipeline ReactFlow Node array
  const { nodes, edges, stageCounts } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Group nodes by their normalized 8-stage category
    const stageNodesMap: Record<string, string[]> = {
      ideation: [],
      taste: [],
      script: [],
      assets: [],
      shot: [],
      footage: [],
      vfx: [],
      assembly: [],
    };

    const counts: Record<string, number> = {};

    for (const node of Object.values(project.nodes)) {
      const canonical = normalizeStage(node.stage);
      if (!stageNodesMap[canonical]) {
        stageNodesMap[canonical] = [];
      }
      stageNodesMap[canonical].push(node.id);
    }

    // Position each stage column from left to right
    PIPELINE_STAGES.forEach((stage, stageIndex) => {
      const nodeIds = stageNodesMap[stage.id] || [];
      counts[stage.id] = nodeIds.length;
      const xOffset = stageIndex * 340 + 60;

      nodeIds.forEach((nodeId, versionIndex) => {
        const node = project.nodes[nodeId];
        const yOffset = versionIndex * 230 + 80;
        const isActiveCut = node.sceneId ? project.activeCut[node.sceneId] === node.id : false;
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

        // 1. Primary Parent-to-Child Dependency Edges
        if (node.parentId && project.nodes[node.parentId]) {
          const parent = project.nodes[node.parentId];
          const isEdgeInActiveCut = Boolean(
            isActiveCut &&
            parent.sceneId &&
            project.activeCut[parent.sceneId] === parent.id
          );

          flowEdges.push({
            id: `e_${node.parentId}_${node.id}`,
            source: node.parentId,
            target: node.id,
            animated: isEdgeInActiveCut,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isEdgeInActiveCut ? '#F59E0B' : '#334155',
            },
            style: {
              stroke: isEdgeInActiveCut ? '#F59E0B' : '#334155',
              strokeWidth: isEdgeInActiveCut ? 2.5 : 1.5,
            },
          });
        }

        // 2. Bound Subject Anchor Reference Edges to Shot Nodes
        if (node.boundSubjectAnchorIds && node.boundSubjectAnchorIds.length > 0) {
          // Find any asset nodes representing these subject anchors
          for (const anchorId of node.boundSubjectAnchorIds) {
            const assetNode = Object.values(project.nodes).find(
              (n) => n.subjectAnchorId === anchorId || n.id.includes(anchorId)
            );
            if (assetNode) {
              flowEdges.push({
                id: `e_asset_${assetNode.id}_${node.id}`,
                source: assetNode.id,
                target: node.id,
                animated: false,
                style: {
                  stroke: '#8B5CF6',
                  strokeWidth: 1.5,
                  strokeDasharray: '4 4',
                },
              });
            }
          }
        }
      });
    });

    return { nodes: flowNodes, edges: flowEdges, stageCounts: counts };
  }, [project, selectedNodeId, onSelectNode, onBranchNode, onSetActiveCut, onMediaDrop]);

  return (
    <div className="relative w-full h-full bg-[#0A0D14] overflow-hidden flex flex-col">
      {/* 8-Stage Pipeline Header Ribbon */}
      <div className="h-11 border-b border-slate-800/80 bg-[#070A0F]/90 backdrop-blur-md px-6 flex items-center justify-between z-10 select-none overflow-x-auto">
        <div className="flex items-center gap-6 min-w-max">
          {PIPELINE_STAGES.map((stage) => {
            const Icon = stage.icon;
            const count = stageCounts[stage.id] || 0;
            return (
              <div key={stage.id} className="flex items-center gap-2 text-xs font-mono">
                <Icon className="w-3.5 h-3.5" style={{ color: stage.color }} />
                <span className="font-bold text-slate-300">{stage.label}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative flex-1">
        <AgentCursorOverlay agents={agents} />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.15}
          maxZoom={1.5}
          className="bg-[#0A0D14]"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1F293D" />
          <Controls className="!bg-[#111726] !border-slate-800 !text-slate-200" />
          <MiniMap
            nodeColor={(n: any) =>
              n.data?.isActiveCut ? '#F59E0B' : n.data?.node?.stage === 'assets' ? '#8B5CF6' : '#1E293B'
            }
            maskColor="rgba(10, 13, 20, 0.75)"
            className="!bg-[#111726] !border-slate-800 rounded-lg overflow-hidden"
          />
        </ReactFlow>
      </div>
    </div>
  );
};
