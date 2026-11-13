import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { CustomVersionNode } from '../tree/CustomVersionNode.js';
import { AgentCursorOverlay } from '../tree/AgentCursorOverlay.js';
import { FilmProject, AgentPresence, VersionNode } from '../../types.js';
import { IdeaFloatingHud } from './hud/IdeaFloatingHud.js';
import { TasteFloatingHud } from './hud/TasteFloatingHud.js';
import { AssetFloatingHud } from './hud/AssetFloatingHud.js';
import { ScriptFloatingHud } from './hud/ScriptFloatingHud.js';
import { ShotFloatingHud } from './hud/ShotFloatingHud.js';
import { TakeFloatingHud } from './hud/TakeFloatingHud.js';
import { CompositionFloatingHud } from './hud/CompositionFloatingHud.js';
import {
  Sparkles,
  Compass,
  User,
  Sliders,
} from 'lucide-react';

interface SpatialDirectorCanvasProps {
  project: FilmProject;
  agents: AgentPresence[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onBranchNode: (nodeId: string) => void;
  onUpdateProject: (updated: FilmProject) => void;
  onSetActiveCut: (sceneId: string, nodeId: string) => void;
  onMediaDrop: (nodeId: string, file: File) => void;
  onOpenDaVinciExport?: () => void;
  onOpenSubjectManager?: () => void;
  onOpenTasteMixer?: () => void;
}

const nodeTypes = {
  customVersion: CustomVersionNode,
};

const STAGE_DEFAULT_X: Record<string, number> = {
  ideation: 60,
  taste: 60,
  script: 420,
  assets: 780,
  shot: 1140,
  storyboard: 1140,
  footage: 1500,
  motion: 1500,
  vfx: 1860,
  assembly: 2220,
  render: 2220,
};

function SpatialDirectorCanvasInner({
  project,
  agents,
  selectedNodeId,
  onSelectNode,
  onBranchNode,
  onUpdateProject,
  onSetActiveCut,
  onMediaDrop,
  onOpenDaVinciExport,
  onOpenSubjectManager,
  onOpenTasteMixer,
}: SpatialDirectorCanvasProps) {
  const { fitView } = useReactFlow();

  // Active in-place floating HUD node ID
  const [activeHudId, setActiveHudId] = useState<string | null>(null);
  const [pinnedHudIds, setPinnedHudIds] = useState<Set<string>>(new Set());

  // Toggle HUD open/close for a node
  const handleToggleHud = useCallback((nodeId: string) => {
    setActiveHudId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  // Escape key closes active floating HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeHudId) {
        setActiveHudId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeHudId]);

  const handleTogglePin = useCallback((nodeId: string) => {
    setPinnedHudIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Node deletion with edge re-linking
  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      try {
        const res = await fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${nodeId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.success && data.project) {
          onUpdateProject(data.project);
          if (activeHudId === nodeId) setActiveHudId(null);
        }
      } catch (err) {
        console.error('Failed to delete node:', err);
      }
    },
    [project.id, onUpdateProject, activeHudId]
  );

  // Inline rename node
  const handleRenameNode = useCallback(
    async (nodeId: string, newTitle: string) => {
      try {
        const res = await fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${nodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle }),
        });
        const data = await res.json();
        if (data.success && data.node) {
          onUpdateProject({
            ...project,
            nodes: {
              ...project.nodes,
              [nodeId]: data.node,
            },
          });
        }
      } catch (err) {
        console.error('Failed to rename node:', err);
      }
    },
    [project, onUpdateProject]
  );

  // Color tag node
  const handleColorTagNode = useCallback(
    async (nodeId: string, colorTag: VersionNode['colorTag']) => {
      try {
        const res = await fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${nodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colorTag }),
        });
        const data = await res.json();
        if (data.success && data.node) {
          onUpdateProject({
            ...project,
            nodes: {
              ...project.nodes,
              [nodeId]: data.node,
            },
          });
        }
      } catch (err) {
        console.error('Failed to tag color:', err);
      }
    },
    [project, onUpdateProject]
  );

  // Persist node position on drag stop
  const handleNodeDragStop = useCallback(
    async (_event: any, flowNode: Node) => {
      try {
        await fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${flowNode.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: flowNode.position }),
        });
        if (project.nodes[flowNode.id]) {
          project.nodes[flowNode.id].position = flowNode.position;
        }
      } catch (err) {
        console.error('Failed to persist position:', err);
      }
    },
    [project]
  );

  // Auto-Tidy / Beautify Layout
  const handleBeautifyFlow = useCallback(() => {
    const stageYOffsets: Record<string, number> = {};
    const updatedNodes = { ...project.nodes };

    Object.values(updatedNodes).forEach((n) => {
      const stage = n.stage || 'script';
      const defaultX = STAGE_DEFAULT_X[stage] || 600;
      if (stage === 'taste' && !stageYOffsets['taste']) {
        stageYOffsets['taste'] = 380;
      }
      const curY = stageYOffsets[stage] || 120;
      n.position = { x: defaultX, y: curY };
      stageYOffsets[stage] = curY + 240;

      // fire patch async
      fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${n.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: n.position }),
      }).catch(() => {});
    });

    onUpdateProject({ ...project, nodes: updatedNodes });
    setTimeout(() => fitView({ duration: 500 }), 50);
  }, [project, onUpdateProject, fitView]);

  // Construct ReactFlow nodes and edges
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    const stageYCounter: Record<string, number> = {};

    Object.values(project.nodes).forEach((n) => {
      const stage = n.stage || 'script';
      let posX = n.position?.x;
      let posY = n.position?.y;

      if (posX === undefined || posY === undefined) {
        posX = STAGE_DEFAULT_X[stage] || 600;
        if (stage === 'taste' && !stageYCounter['taste']) {
          stageYCounter['taste'] = 380;
        }
        posY = stageYCounter[stage] || 120;
        stageYCounter[stage] = posY + 240;
      }

      const isActiveCut = n.sceneId ? project.activeCut[n.sceneId] === n.id : false;
      const isSelected = selectedNodeId === n.id;
      const isHudOpen = activeHudId === n.id || pinnedHudIds.has(n.id);

      flowNodes.push({
        id: n.id,
        type: 'customVersion',
        position: { x: posX, y: posY },
        data: {
          node: n,
          isActiveCut,
          isSelected,
          isHudOpen,
          onSelect: onSelectNode,
          onToggleHud: handleToggleHud,
          onBranch: onBranchNode,
          onDelete: handleDeleteNode,
          onRename: handleRenameNode,
          onColorTag: handleColorTagNode,
          onSetActiveCut,
          onMediaDrop,
        },
      });

      // 1. Primary Lineage Edges
      if (n.parentId && project.nodes[n.parentId]) {
        const parent = project.nodes[n.parentId];
        const isEdgeInActiveCut = Boolean(
          isActiveCut && parent.sceneId && project.activeCut[parent.sceneId] === parent.id
        );

        flowEdges.push({
          id: `e_${n.parentId}_${n.id}`,
          source: n.parentId,
          target: n.id,
          animated: isEdgeInActiveCut,
          className: isEdgeInActiveCut ? 'wire-active' : undefined,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isEdgeInActiveCut ? '#EAB308' : '#3F3F46',
          },
          style: {
            stroke: isEdgeInActiveCut ? '#EAB308' : '#27272A',
            strokeWidth: isEdgeInActiveCut ? 2.5 : 1.5,
          },
        });
      }

      // 2. Bound Subject Anchor Reference Edges to Shot Nodes
      if (n.boundSubjectAnchorIds && n.boundSubjectAnchorIds.length > 0) {
        for (const anchorId of n.boundSubjectAnchorIds) {
          const assetNode = Object.values(project.nodes).find(
            (nodeItem) => nodeItem.subjectAnchorId === anchorId || nodeItem.id.includes(anchorId)
          );
          if (assetNode) {
            flowEdges.push({
              id: `e_asset_${assetNode.id}_${n.id}`,
              source: assetNode.id,
              target: n.id,
              animated: false,
              style: {
                stroke: '#A855F7',
                strokeWidth: 1.5,
                strokeDasharray: '4 4',
              },
            });
          }
        }
      }
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [
    project,
    selectedNodeId,
    activeHudId,
    pinnedHudIds,
    onSelectNode,
    handleToggleHud,
    onBranchNode,
    handleDeleteNode,
    handleRenameNode,
    handleColorTagNode,
    onSetActiveCut,
    onMediaDrop,
  ]);

  // Determine which HUDs to render
  const hudsToRender = useMemo(() => {
    const list: string[] = [];
    if (activeHudId && project.nodes[activeHudId]) list.push(activeHudId);
    pinnedHudIds.forEach((id) => {
      if (id !== activeHudId && project.nodes[id]) list.push(id);
    });
    return list;
  }, [activeHudId, pinnedHudIds, project.nodes]);

  const renderFloatingHudForNode = (nodeId: string) => {
    const node = project.nodes[nodeId];
    if (!node) return null;
    const isPinned = pinnedHudIds.has(nodeId);

    const commonProps = {
      node,
      project,
      onUpdateProject,
      onClose: () => {
        if (activeHudId === nodeId) setActiveHudId(null);
        if (pinnedHudIds.has(nodeId)) handleTogglePin(nodeId);
      },
      isPinned,
      onTogglePin: () => handleTogglePin(nodeId),
    };

    switch (node.stage) {
      case 'ideation':
        return <IdeaFloatingHud key={node.id} {...commonProps} />;
      case 'taste':
        return <TasteFloatingHud key={node.id} {...commonProps} />;
      case 'assets':
        return <AssetFloatingHud key={node.id} {...commonProps} />;
      case 'script':
        return <ScriptFloatingHud key={node.id} {...commonProps} />;
      case 'shot':
      case 'storyboard':
        return <ShotFloatingHud key={node.id} {...commonProps} />;
      case 'footage':
      case 'motion':
        return <TakeFloatingHud key={node.id} {...commonProps} />;
      case 'assembly':
      case 'vfx':
      case 'render':
        return (
          <CompositionFloatingHud
            key={node.id}
            {...commonProps}
            onOpenDaVinciExport={onOpenDaVinciExport}
          />
        );
      default:
        return <IdeaFloatingHud key={node.id} {...commonProps} />;
    }
  };

  return (
    <div className="relative w-full h-full bg-app overflow-hidden select-none flex flex-col">
      {/* Top Floating Mini-Nav Strip */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2 bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-subtle shadow-xl text-xs font-mono">
        <span className="text-text-primary font-bold flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-accent-primary" />
          <span>SPATIAL CANVAS</span>
        </span>
        <span className="text-subtle">|</span>
        <span className="text-text-muted">{Object.keys(project.nodes).length} Nodes</span>

        <button
          onClick={handleBeautifyFlow}
          className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-card hover:bg-subtle border border-subtle text-text-primary flex items-center gap-1 transition"
          title="Auto-align and resolve overlapping nodes"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Beautify Flow</span>
        </button>

        {onOpenSubjectManager && (
          <button
            onClick={onOpenSubjectManager}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-card hover:bg-subtle border border-subtle text-text-muted hover:text-text-primary flex items-center gap-1 transition"
            title="Manage Subject Consistency Anchors"
          >
            <User className="w-3 h-3 text-purple-400" />
            <span>Subjects</span>
          </button>
        )}

        {onOpenTasteMixer && (
          <button
            onClick={onOpenTasteMixer}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-card hover:bg-subtle border border-subtle text-text-muted hover:text-text-primary flex items-center gap-1 transition"
            title="Director Taste DNA Settings"
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>Taste DNA</span>
          </button>
        )}
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1">
        <AgentCursorOverlay agents={agents} />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={() => setActiveHudId(null)}
          fitView
          minZoom={0.15}
          maxZoom={1.5}
          className="bg-app canvas-dots"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--dot-color)" />
          <Controls className="!bg-surface !border-subtle !text-text-primary !rounded-xl overflow-hidden" />
          <MiniMap
            nodeColor={(n: any) =>
              n.data?.isActiveCut ? '#EAB308' : n.data?.node?.stage === 'assets' ? '#A855F7' : 'var(--border-subtle)'
            }
            maskColor="rgba(0, 0, 0, 0.75)"
            className="!bg-surface !border-subtle rounded-xl overflow-hidden shadow-2xl"
          />
        </ReactFlow>

        {/* IN-PLACE FLOATING HUDS OVERLAY (Anchored Top-Right or Freely Positioned) */}
        {hudsToRender.length > 0 && (
          <div className="absolute top-4 right-4 z-30 flex flex-col gap-3 max-h-[85vh] overflow-y-auto pointer-events-auto">
            {hudsToRender.map((id) => renderFloatingHudForNode(id))}
          </div>
        )}
      </div>
    </div>
  );
}

export const SpatialDirectorCanvas: React.FC<SpatialDirectorCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <SpatialDirectorCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
