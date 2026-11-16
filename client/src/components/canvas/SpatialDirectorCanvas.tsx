import { apiFetch } from '../../services/api';
import React, { useMemo, useState, useCallback, useEffect, lazy, Suspense } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  Connection,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import { CustomVersionNode } from '../tree/CustomVersionNode.js';
import { StickyNoteNode, StickyColor } from '../tree/StickyNoteNode.js';
import { AssetGroupFrame } from './frames/AssetGroupFrame.js';
const LazyPrevis = lazy(()=>import('./nodes/PrevisThreeJsNode.js').then(module=>({default:module.PrevisThreeJsNode})));
const PrevisThreeJsNode = (props:any)=><Suspense fallback={<div className="p-8 bg-card text-text-muted">Loading 3D editor…</div>}><LazyPrevis {...props}/></Suspense>;
import { FloatingCanvasToolbar, CanvasToolMode } from './FloatingCanvasToolbar.js';
import { AgentCursorOverlay } from '../tree/AgentCursorOverlay.js';
import { FilmProject, AgentPresence, VersionNode, GraphEdge } from '../../types.js';
import {
  wouldCreateCycle,
  getActiveLineageNodeIds,
  arePortsCompatible,
  getDefaultPortsForType,
  PORT_COLOR_MAP,
} from '../../utils/graphTopology.js';
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
  Trash2,
  Layers,
  Video,
  Image as ImageIcon,
  FileAudio,
  Loader2,
  X,
  FileText,
  Camera,
  GitBranch,
  Star,
  StickyNote,
  RotateCw,
} from 'lucide-react';
import { toast } from '../../services/toastService.js';

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
  onOpenProjectSettings?: () => void;
}

const nodeTypes: Record<string, React.ComponentType<any>> = {
  customVersion: CustomVersionNode,
  stickyNote: StickyNoteNode,
  assetGroupFrame: AssetGroupFrame,
  previsThreeJs: PrevisThreeJsNode,
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
  onOpenProjectSettings,
}: SpatialDirectorCanvasProps) {
  const { fitView, zoomIn, zoomOut, flowToScreenPosition, screenToFlowPosition, setCenter } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Canvas tool mode (Select / Marquee / Pan)
  const [toolMode, setToolMode] = useState<CanvasToolMode>('select');

  // Active in-place floating HUD node ID
  const [activeHudId, setActiveHudId] = useState<string | null>(null);
  const [pinnedHudIds, setPinnedHudIds] = useState<Set<string>>(new Set());

  // Node deletion confirmation state
  const [nodeToDelete, setNodeToDelete] = useState<VersionNode | null>(null);
  const [isDeletingNode, setIsDeletingNode] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    type: 'canvas' | 'node';
    screenX: number;
    screenY: number;
    flowX: number;
    flowY: number;
    nodeId?: string;
  } | null>(null);

  // Handle Growth Quick-Picker State (spawning downstream node on handle drag)
  const [growthPicker, setGrowthPicker] = useState<{
    sourceNodeId: string;
    screenX: number;
    screenY: number;
    flowX: number;
    flowY: number;
  } | null>(null);

  // Toggle HUD open/close for a node
  const handleToggleHud = useCallback((nodeId: string) => {
    setActiveHudId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  // Escape key closes menus or active floating HUD or delete modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null);
        } else if (growthPicker) {
          setGrowthPicker(null);
        } else if (nodeToDelete) {
          setNodeToDelete(null);
        } else if (activeHudId) {
          setActiveHudId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeHudId, nodeToDelete, contextMenu, growthPicker]);

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

  // Prompt node deletion modal
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const target = project.nodes[nodeId];
      if (target) {
        setNodeToDelete(target);
      }
    },
    [project.nodes]
  );

  // Confirm node deletion with optional file cleanup
  const handleConfirmDeleteNode = useCallback(
    async (deleteFilesFromSystem: boolean) => {
      if (!nodeToDelete) return;
      setIsDeletingNode(true);
      try {
        const res = await apiFetch(
          `/api/projects/${project.id}/nodes/${nodeToDelete.id}?deleteFiles=${deleteFilesFromSystem}`,
          {
            method: 'DELETE',
          }
        );
        const data = await res.json();
        if (data.success && data.project) {
          onUpdateProject(data.project);
          if (activeHudId === nodeToDelete.id) setActiveHudId(null);
          setPinnedHudIds((prev) => {
            const next = new Set(prev);
            next.delete(nodeToDelete.id);
            return next;
          });
          setNodeToDelete(null);
          toast.success(
            deleteFilesFromSystem ? 'Node deleted and files moved to Trash' : 'Node removed from DAG'
          );
        }
      } catch (err) {
        console.error('Failed to delete node:', err);
        toast.error('Failed to delete node');
      } finally {
        setIsDeletingNode(false);
      }
    },
    [project.id, nodeToDelete, onUpdateProject, activeHudId]
  );

  // Inline rename node
  const handleRenameNode = useCallback(
    async (nodeId: string, newTitle: string) => {
      try {
        const res = await apiFetch(`/api/projects/${project.id}/nodes/${nodeId}`, {
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
          toast.success('Renamed node');
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
        const res = await apiFetch(`/api/projects/${project.id}/nodes/${nodeId}`, {
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
          toast.success(`Color tag updated`);
        }
      } catch (err) {
        console.error('Failed to tag color:', err);
      }
    },
    [project, onUpdateProject]
  );

  // Re-sync stale node prompt
  const handleResyncStale = useCallback(
    async (nodeId: string) => {
      const target = project.nodes[nodeId];
      if (!target) return;
      toast.info('Re-syncing contextual prompt from upstream...');
      try {
        const res = await apiFetch(
          `/api/projects/${project.id}/nodes/${nodeId}/synthesize-prompt`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetPlatform: target.modelEngine || 'runway' }),
          }
        );
        const data = await res.json();
        if (data.success && data.node) {
          onUpdateProject({
            ...project,
            nodes: {
              ...project.nodes,
              [nodeId]: {
                ...data.node,
                isStale: false,
                staleReason: undefined,
              },
            },
          });
          toast.success('Node prompt re-synced with upstream changes');
        }
      } catch (err) {
        console.error('Failed to re-sync node:', err);
        toast.error('Re-sync failed');
      }
    },
    [project, onUpdateProject]
  );

  // Drag stop on node
  const handleNodeDragStop = useCallback(
    async (_event: any, node: Node) => {
      // Check if it's a sticky note
      if (node.type === 'stickyNote') {
        const updatedNotes = (project.stickyNotes || []).map((n) =>
          n.id === node.id ? { ...n, position: node.position } : n
        );
        onUpdateProject({ ...project, stickyNotes: updatedNotes });
        try {
          await apiFetch(`/api/projects/${project.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stickyNotes: updatedNotes }),
          });
        } catch {}
        return;
      }

      const versionNode = project.nodes[node.id];
      if (!versionNode) return;

      const updatedNode = {
        ...versionNode,
        position: node.position,
      };

      onUpdateProject({
        ...project,
        nodes: {
          ...project.nodes,
          [node.id]: updatedNode,
        },
      });

      try {
        await apiFetch(`/api/projects/${project.id}/nodes/${node.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: node.position }),
        });
      } catch (err) {
        console.error('Failed to persist node position:', err);
      }
    },
    [project, onUpdateProject]
  );

  // Handle adding a new node to canvas
  const handleAddNode = useCallback(
    async (stage: string, customPos?: { x: number; y: number }, parentId?: string) => {
      const center = customPos || screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const newId = `node_${stage}_${Math.random().toString(36).slice(2, 7)}`;
      const title =
        stage === 'script'
          ? 'New Screenplay Beat'
          : stage === 'shot'
          ? 'New Shot Optics'
          : stage === 'assets'
          ? 'New Subject Anchor'
          : stage === 'footage'
          ? 'New Video Take'
          : `New ${stage.charAt(0).toUpperCase() + stage.slice(1)}`;

      const newNode: VersionNode = {
        id: newId,
        parentId: parentId || null,
        sceneId: project.scenes[0]?.id,
        stage: stage as any,
        versionLabel: 'v1.0',
        title,
        modelEngine: 'antigravity-cli',
        prompt: `Production prompt for ${title}`,
        position: center,
        artifacts: {},
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'idle',
        },
      };

      const updatedProject = {
        ...project,
        nodes: {
          ...project.nodes,
          [newId]: newNode,
        },
      };

      onUpdateProject(updatedProject);
      setActiveHudId(newId);
      toast.success(`Created ${title}`);

      try {
        await apiFetch(`/api/projects/${project.id}/nodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newNode),
        });
      } catch {}
    },
    [project, onUpdateProject, screenToFlowPosition]
  );

  // Handle resizing node width
  const handleResizeNode = useCallback(
    async (nodeId: string, width: number) => {
      const vNode = project.nodes[nodeId];
      if (!vNode) return;
      onUpdateProject({
        ...project,
        nodes: {
          ...project.nodes,
          [nodeId]: { ...vNode, width },
        },
      });
      try {
        await apiFetch(`/api/projects/${project.id}/nodes/${nodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ width }),
        });
      } catch {}
    },
    [project, onUpdateProject]
  );

  // Handle auto-adding next stage node
  const handleAutoAddNextStage = useCallback(
    async (sourceNodeId: string, nextStage: string) => {
      const sourceNode = project.nodes[sourceNodeId];
      if (!sourceNode) return;
      const posX = (sourceNode.position?.x || 100) + (sourceNode.width || 320) + 80;
      const posY = sourceNode.position?.y || 120;
      await handleAddNode(nextStage, { x: posX, y: posY }, sourceNodeId);
      toast.success(`Created downstream ${nextStage} node`);
    },
    [project.nodes, handleAddNode]
  );

  // Sticky Note Operations
  const handleAddStickyNote = useCallback(() => {
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const newNote = {
      id: `note_${Math.random().toString(36).slice(2, 7)}`,
      text: '## Director Note\n- [ ] Check audio stem mix\n- [ ] Review character style parity\n- Pacing timing punch',
      color: 'yellow' as StickyColor,
      isPinned: false,
      position: { x: center.x - 120, y: center.y - 80 },
    };
    const updatedNotes = [...(project.stickyNotes || []), newNote];
    onUpdateProject({ ...project, stickyNotes: updatedNotes });
    toast.success('Dropped sticky note on canvas');

    apiFetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stickyNotes: updatedNotes }),
    }).catch(() => {});
  }, [project, onUpdateProject, screenToFlowPosition]);

  const handleUpdateStickyNote = useCallback(
    (noteId: string, text: string, color: StickyColor, isPinned: boolean) => {
      const updatedNotes = (project.stickyNotes || []).map((n) =>
        n.id === noteId ? { ...n, text, color, isPinned } : n
      );
      onUpdateProject({ ...project, stickyNotes: updatedNotes });

      apiFetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stickyNotes: updatedNotes }),
      }).catch(() => {});
    },
    [project, onUpdateProject]
  );

  const handleDeleteStickyNote = useCallback(
    (noteId: string) => {
      const updatedNotes = (project.stickyNotes || []).filter((n) => n.id !== noteId);
      onUpdateProject({ ...project, stickyNotes: updatedNotes });
      toast.info('Sticky note deleted');

      apiFetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stickyNotes: updatedNotes }),
      }).catch(() => {});
    },
    [project, onUpdateProject]
  );

  // Beautify Flow Auto-Layout
  const handleBeautifyFlow = useCallback(async () => {
    const stageYTrackers: Record<string, number> = {};
    const updatedNodes = { ...project.nodes };

    Object.values(updatedNodes).forEach((node) => {
      const stageKey = node.stage || 'ideation';
      const defaultX = STAGE_DEFAULT_X[stageKey] || 60;
      const currentY = stageYTrackers[stageKey] ?? 100;

      node.position = {
        x: defaultX,
        y: currentY,
      };

      stageYTrackers[stageKey] = currentY + 280;
    });

    onUpdateProject({
      ...project,
      nodes: updatedNodes,
    });

    toast.success('Auto-aligned spatial DAG flow');

    setTimeout(() => {
      fitView({ duration: 800, padding: 0.2 });
    }, 50);
  }, [project, onUpdateProject, fitView]);

  // Handle direct typed wire connections
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) {
        toast.error('Cannot connect node to itself');
        return;
      }

      // 1. Cycle detection
      if (wouldCreateCycle(connection.source, connection.target, project.edges || {})) {
        toast.error('Connection rejected: would create a circular dependency loop');
        return;
      }

      // 2. Port compatibility check
      const sourceNode = project.nodes[connection.source];
      const targetNode = project.nodes[connection.target];
      if (sourceNode && targetNode) {
        const sourcePorts =
          sourceNode.outputPorts ||
          getDefaultPortsForType(sourceNode.type || sourceNode.stage).outputPorts;
        const targetPorts =
          targetNode.inputPorts ||
          getDefaultPortsForType(targetNode.type || targetNode.stage).inputPorts;
        const sourcePort = connection.sourceHandle
          ? sourcePorts[connection.sourceHandle]
          : Object.values(sourcePorts)[0];
        const targetPort = connection.targetHandle
          ? targetPorts[connection.targetHandle]
          : Object.values(targetPorts)[0];

        if (sourcePort && targetPort && !arePortsCompatible(sourcePort, targetPort)) {
          toast.warning(
            `Port mismatch: ${sourcePort.name} (${sourcePort.type}) cannot directly feed into ${targetPort.name} (${targetPort.type})`
          );
          return;
        }
      }

      // 3. Create explicit typed edge
      const edgeId = `edge_${connection.source}_${connection.target}_${Date.now()}`;
      const newEdge: GraphEdge = {
        id: edgeId,
        sourceNodeId: connection.source,
        sourcePortId: connection.sourceHandle || 'out_primary',
        targetNodeId: connection.target,
        targetPortId: connection.targetHandle || 'in_primary',
        type: 'primary',
      };

      const updatedEdges = {
        ...(project.edges || {}),
        [edgeId]: newEdge,
      };

      // Also set parentId if target had no parent
      const updatedNodes = { ...project.nodes };
      if (!updatedNodes[connection.target].parentId) {
        updatedNodes[connection.target] = {
          ...updatedNodes[connection.target],
          parentId: connection.source,
        };
      }

      const updatedProject = {
        ...project,
        nodes: updatedNodes,
        edges: updatedEdges,
      };

      onUpdateProject(updatedProject);
      toast.success('Connected nodes');

      apiFetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: updatedNodes, edges: updatedEdges }),
      }).catch(() => {});
    },
    [project, onUpdateProject]
  );

  // Connect End Handle Growth Spawning (when handle is dropped on empty canvas)
  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: any) => {
      if (!connectionState.isValid && connectionState.fromNode) {
        const mouseEvent = event as MouseEvent;
        const flowPos = screenToFlowPosition({ x: mouseEvent.clientX, y: mouseEvent.clientY });
        setGrowthPicker({
          sourceNodeId: connectionState.fromNode.id,
          screenX: mouseEvent.clientX,
          screenY: mouseEvent.clientY,
          flowX: flowPos.x,
          flowY: flowPos.y,
        });
      }
    },
    [screenToFlowPosition]
  );

  // Build ReactFlow Nodes and Edges
  const computedFlow = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Calculate active lineage
    const activeSinkId =
      project.activeSinkNodeId ||
      Object.keys(project.nodes).find((id) => project.nodes[id].stage === 'assembly') ||
      '';
    const activeLineageList = getActiveLineageNodeIds(
      activeSinkId,
      project.nodes,
      project.edges || {}
    );
    const activeLineageSet = new Set(activeLineageList);

    // 1. Version Nodes
    Object.values(project.nodes).forEach((node) => {
      const isActiveCut = Boolean(
        node.sceneId && project.activeCut[node.sceneId] === node.id
      );

      const stageKey = node.stage || 'ideation';
      const defaultX = STAGE_DEFAULT_X[stageKey] || 60;
      const defaultY = 120;
      const position = node.position || { x: defaultX, y: defaultY };
      const isNodeActiveLineage = activeLineageSet.size === 0 || activeLineageSet.has(node.id);
      const isPrevis =
        node.type === 'previs.threejs' ||
        node.stage === ('previs' as any) ||
        node.id.includes('previs');

      flowNodes.push({
        id: node.id,
        type: isPrevis ? 'previsThreeJs' : 'customVersion',
        position,
        draggable: toolMode !== 'pan',
        data: isPrevis
          ? {
              id: node.id,
              title: node.title,
              durationSec:
                node.shotContextOverrides?.motionSpeed === 'slow_cinematic' ? 4.5 : 3.0,
              initialMoveType:
                node.shotContextOverrides?.cameraMovement?.toLowerCase().includes('orbit')
                  ? 'orbit'
                  : node.shotContextOverrides?.cameraMovement?.toLowerCase().includes('crane')
                  ? 'crane'
                  : 'push_in',
              isSelected: selectedNodeId === node.id,
              onSelect: onSelectNode,
              onAnimaticRendered: (nodeId: string, videoUrl: string) => {
                const updatedNodes = {
                  ...project.nodes,
                  [nodeId]: {
                    ...project.nodes[nodeId],
                    artifacts: {
                      ...project.nodes[nodeId]?.artifacts,
                      mediaUrl: videoUrl,
                    },
                  },
                };
                onUpdateProject({ ...project, nodes: updatedNodes });
              },
            }
          : {
              node,
              projectId: project.id,
              isActiveCut,
              isSelected: selectedNodeId === node.id,
              isHudOpen: activeHudId === node.id || pinnedHudIds.has(node.id),
              isDimmed: !isNodeActiveLineage,
              onSelect: (nodeId: string) => {
                onSelectNode(nodeId);
                if (project.nodes[nodeId]?.stage === 'assembly') {
                  onUpdateProject({ ...project, activeSinkNodeId: nodeId });
                }
              },
              onToggleHud: handleToggleHud,
              onBranch: onBranchNode,
              onDelete: handleDeleteNode,
              onRename: handleRenameNode,
              onColorTag: handleColorTagNode,
              onSetActiveCut,
              onMediaDrop,
              onResyncStale: handleResyncStale,
              onResize: handleResizeNode,
              onAutoAddNextStage: handleAutoAddNextStage,
            },
      });
    });

    // 2. Edges
    if (project.edges && Object.keys(project.edges).length > 0) {
      Object.values(project.edges).forEach((edge) => {
        const sourceNode = project.nodes[edge.sourceNodeId];
        const targetNode = project.nodes[edge.targetNodeId];
        if (!sourceNode || !targetNode) return;

        const isBothActive =
          activeLineageSet.has(edge.sourceNodeId) && activeLineageSet.has(edge.targetNodeId);

        const defaultPorts = getDefaultPortsForType(sourceNode.type || sourceNode.stage);
        const sourcePort =
          (sourceNode.outputPorts || defaultPorts.outputPorts)[edge.sourcePortId];
        const portColor = sourcePort
          ? PORT_COLOR_MAP[sourcePort.type] || '#A1A1AA'
          : '#A1A1AA';

        const strokeColor = isBothActive ? portColor || '#38BDF8' : '#52525B';
        const strokeWidth = isBothActive ? 2.5 : 1.5;
        const opacity = isBothActive ? 1 : 0.35;

        flowEdges.push({
          id: edge.id,
          source: edge.sourceNodeId,
          sourceHandle: edge.sourcePortId,
          target: edge.targetNodeId,
          targetHandle: edge.targetPortId,
          animated: isBothActive,
          style: {
            stroke: strokeColor,
            strokeWidth,
            opacity,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
          },
        });
      });
    } else {
      // Fallback for legacy parent-child relationships
      Object.values(project.nodes).forEach((node) => {
        if (node.parentId && project.nodes[node.parentId]) {
          const isBothActive =
            activeLineageSet.has(node.parentId) && activeLineageSet.has(node.id);
          flowEdges.push({
            id: `e-${node.parentId}-${node.id}`,
            source: node.parentId,
            target: node.id,
            animated: isBothActive,
            style: {
              stroke: isBothActive ? '#38BDF8' : 'var(--border-subtle)',
              strokeWidth: isBothActive ? 2.5 : 1.5,
              opacity: isBothActive ? 1 : 0.35,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isBothActive ? '#38BDF8' : 'var(--border-subtle)',
            },
          });
        }

        // Bound Subject Anchor edges (Violet)
        if (node.boundSubjectAnchorIds && node.boundSubjectAnchorIds.length > 0) {
          for (const anchorId of node.boundSubjectAnchorIds) {
            const anchorNode = Object.values(project.nodes).find(
              (n) => n.stage === 'assets' && (n.subjectAnchorId === anchorId || n.id === anchorId)
            );
            if (anchorNode && anchorNode.id !== node.id) {
              flowEdges.push({
                id: `edge-anchor-${anchorNode.id}-${node.id}`,
                source: anchorNode.id,
                target: node.id,
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
    }

    // 2. Sticky Notes Nodes
    (project.stickyNotes || []).forEach((note) => {
      flowNodes.push({
        id: note.id,
        type: 'stickyNote',
        position: note.position,
        draggable: !note.isPinned && toolMode !== 'pan',
        data: {
          id: note.id,
          text: note.text,
          color: note.color,
          isPinned: note.isPinned,
          onUpdateNote: handleUpdateStickyNote,
          onDeleteNote: handleDeleteStickyNote,
        },
      });
    });

    // 3. Asset Group Frame (if project has subject anchors)
    const subjectAnchors = project.subjectAnchors || [];
    if (subjectAnchors.length > 0) {
      const charCount = subjectAnchors.filter((a) => a.category === 'character').length;
      const prodCount = subjectAnchors.filter((a) => a.category === 'product' || a.category === 'prop').length;

      flowNodes.push({
        id: 'frame_asset_group_main',
        type: 'assetGroupFrame',
        position: { x: 780, y: 20 },
        draggable: toolMode !== 'pan',
        data: {
          id: 'frame_asset_group_main',
          title: 'Hero Cast & Props Frame',
          assetCount: subjectAnchors.length,
          characterCount: charCount,
          productCount: prodCount,
          isSelected: selectedNodeId === 'frame_asset_group_main',
          onSelect: onSelectNode,
        },
      });
    }

    return { nodes: flowNodes, edges: flowEdges };
  }, [
    project,
    selectedNodeId,
    activeHudId,
    pinnedHudIds,
    toolMode,
    onSelectNode,
    handleToggleHud,
    onBranchNode,
    handleDeleteNode,
    handleRenameNode,
    handleColorTagNode,
    handleResyncStale,
    onSetActiveCut,
    onMediaDrop,
    handleResizeNode,
    handleAutoAddNextStage,
    handleUpdateStickyNote,
    handleDeleteStickyNote,
  ]);

  useEffect(() => {
    setNodes(computedFlow.nodes);
    setEdges(computedFlow.edges);
  }, [computedFlow, setNodes, setEdges]);

  // Compute Viewport-Bounded Coordinates for active HUD
  const activeHudPosition = useMemo(() => {
    if (!activeHudId || !project.nodes[activeHudId]) return null;
    const node = project.nodes[activeHudId];
    const nodePos = node.position || { x: 300, y: 150 };

    try {
      const screenPos = flowToScreenPosition({ x: nodePos.x + 320, y: nodePos.y });
      const hudWidth = 370;
      const hudHeight = 440;
      let posX = screenPos.x;
      let posY = screenPos.y;

      // Flip left if clipping right
      if (posX + hudWidth > window.innerWidth - 20) {
        posX = Math.max(20, screenPos.x - hudWidth - 340);
      }
      // Offset up if clipping bottom
      if (posY + hudHeight > window.innerHeight - 80) {
        posY = Math.max(70, window.innerHeight - hudHeight - 80);
      }
      if (posY < 70) posY = 70;

      return { left: posX, top: posY };
    } catch {
      return { right: 20, top: 20 };
    }
  }, [activeHudId, project.nodes, flowToScreenPosition]);

  useEffect(()=>{
    if(!selectedNodeId)return;
    const node=project.nodes[selectedNodeId];if(!node)return;
    setActiveHudId(selectedNodeId);
  },[selectedNodeId]);

  // Render HUD for a given node
  const renderFloatingHudForNode = (nodeId: string) => {
    const node = project.nodes[nodeId];
    if (!node) return null;
    const isPinned = pinnedHudIds.has(nodeId);

    const commonProps = {
      node,
      project,
      onUpdateProject,
      onMediaDrop,
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
      <div className="relative mx-4 my-2 shrink-0 self-start z-20 flex items-center gap-2 bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-subtle shadow-xl text-xs font-mono">
        <span className="text-text-primary font-bold flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-accent-primary" />
          <span>Spatial Canvas</span>
        </span>
        <span className="text-subtle">|</span>
        <span className="text-text-muted">{Object.keys(project.nodes).length} Nodes</span>

        <button
          onClick={handleBeautifyFlow}
          className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-card hover:bg-subtle border border-subtle text-text-primary flex items-center gap-1 transition"
          title="Auto-align and resolve overlapping nodes (B)"
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

      {/* FLOATING LEFT-SIDE VERTICAL TOOLBAR */}
      <FloatingCanvasToolbar
        toolMode={toolMode}
        onSetToolMode={setToolMode}
        onAddStickyNote={handleAddStickyNote}
        onAddNode={(stage) => handleAddNode(stage)}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitView={() => fitView({ duration: 600, padding: 0.2 })}
        onBeautifyFlow={handleBeautifyFlow}
      />

      {/* Canvas Area */}
      <div className="relative flex-1 min-h-0">
        <AgentCursorOverlay agents={agents} />

        <nav aria-label="Production stages" className="absolute top-0 left-16 right-3 z-20 flex gap-2 overflow-x-auto py-2 bg-app/90">
          {['ideation','taste','script','assets','shot','footage','vfx','assembly'].map((stage,index)=>{
            const targets=Object.values(project.nodes).filter(node=>node.stage===stage);
            return <button key={stage} disabled={!targets.length} className="shrink-0 px-3 py-2 border border-subtle rounded text-xs text-text-primary bg-surface disabled:opacity-40" onClick={()=>{const node=targets[0];onSelectNode(node.id);setActiveHudId(node.id);setCenter((node.position?.x||STAGE_DEFAULT_X[stage])+150,(node.position?.y||120)+100,{zoom:0.85,duration:250});}}>{index+1}. {({ideation:'Idea',taste:'Style',script:'Script',assets:'Subjects',shot:'Shots',footage:'Takes',vfx:'Effects',assembly:'Assembly'} as Record<string,string>)[stage]}</button>;
          })}
        </nav>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={() => {
            setActiveHudId(null);
            setContextMenu(null);
            setGrowthPicker(null);
          }}
          onConnect={handleConnect}
          onConnectEnd={handleConnectEnd}
          onPaneContextMenu={(e) => {
            e.preventDefault();
            const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            setContextMenu({
              type: 'canvas',
              screenX: e.clientX,
              screenY: e.clientY,
              flowX: flowPos.x,
              flowY: flowPos.y,
            });
          }}
          onNodeContextMenu={(e, node) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({
              type: 'node',
              screenX: e.clientX,
              screenY: e.clientY,
              flowX: node.position.x,
              flowY: node.position.y,
              nodeId: node.id,
            });
          }}
          defaultViewport={{x:60,y:24,zoom:0.8}}
          style={{position:'absolute',top:48,height:'calc(100% - 48px)'}}
          minZoom={0.15}
          maxZoom={1.5}
          panOnDrag={toolMode === 'pan' || toolMode === 'select'}
          selectionOnDrag={toolMode === 'marquee'}
          selectNodesOnDrag={toolMode === 'marquee'}
          className="bg-app canvas-dots"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--dot-color)" />
          <Controls className="!bg-surface !border-subtle !text-text-primary !rounded-xl overflow-hidden" />
          <MiniMap
            onNodeClick={(_e, clickedNode) => {
              if (clickedNode && clickedNode.position) {
                setCenter(clickedNode.position.x + (clickedNode.width || 320) / 2, clickedNode.position.y + 100, {
                  duration: 500,
                });
                onSelectNode(clickedNode.id);
              }
            }}
            nodeColor={(n: any) =>
              n.data?.isActiveCut
                ? '#EAB308'
                : n.data?.node?.stage === 'assets'
                ? '#8B5CF6'
                : n.data?.node?.stage === 'script'
                ? '#10B981'
                : n.data?.node?.stage === 'shot'
                ? '#06B6D4'
                : n.type === 'stickyNote'
                ? '#F59E0B'
                : '#71717A'
            }
            maskColor="rgba(0, 0, 0, 0.75)"
            className="!bg-surface !border-subtle rounded-xl overflow-hidden shadow-2xl cursor-pointer"
          />
        </ReactFlow>

        {/* VIEWPORT-BOUNDED ACTIVE HUD (Floats adjacent to selected node) */}
        {activeHudId && activeHudPosition && (
          <div
            aria-label="Selected node inspector"
            className="studio-inspector absolute right-3 top-14 bottom-3 z-40 w-[370px] overflow-y-auto pointer-events-auto bg-surface border border-subtle rounded-lg"
          >
            {renderFloatingHudForNode(activeHudId)}
          </div>
        )}

        {/* CONTEXT MENUS (Canvas & Node) */}
        {contextMenu && (
          <div
            style={{ left: contextMenu.screenX, top: contextMenu.screenY }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 w-56 bg-surface border border-subtle rounded-2xl shadow-2xl p-1.5 space-y-1 animate-scale-in text-xs font-mono"
          >
            {contextMenu.type === 'canvas' ? (
              <>
                <div className="text-[10px] font-bold text-text-muted px-2 py-1 uppercase">
                  Add to Canvas
                </div>
                <button
                  onClick={() => {
                    handleAddNode('script', { x: contextMenu.flowX, y: contextMenu.flowY });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add Screenplay Beat</span>
                </button>
                <button
                  onClick={() => {
                    handleAddNode('shot', { x: contextMenu.flowX, y: contextMenu.flowY });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
                >
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  <span>Add Shot & Optics</span>
                </button>
                <button
                  onClick={() => {
                    handleAddNode('assets', { x: contextMenu.flowX, y: contextMenu.flowY });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
                >
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span>Add Subject Anchor</span>
                </button>
                <button
                  onClick={() => {
                    handleAddNode('footage', { x: contextMenu.flowX, y: contextMenu.flowY });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
                >
                  <Video className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Video Take</span>
                </button>
                <div className="h-[1px] bg-subtle my-1" />
                <button
                  onClick={() => {
                    handleAddStickyNote();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
                >
                  <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Sticky Note (N)</span>
                </button>
                <button
                  onClick={() => {
                    handleBeautifyFlow();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto-Align Canvas</span>
                </button>
                {onOpenProjectSettings && (
                  <button
                    onClick={() => {
                      onOpenProjectSettings();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
                  >
                    <Sliders className="w-3.5 h-3.5 text-text-muted" />
                    <span>Project Settings</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="text-[10px] font-bold text-text-muted px-2 py-1 uppercase truncate">
                  Node: {contextMenu.nodeId}
                </div>
                {contextMenu.nodeId && (
                  <>
                    <button
                      onClick={() => {
                        handleToggleHud(contextMenu.nodeId!);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card transition text-left"
                    >
                      <Compass className="w-3.5 h-3.5 text-accent-primary" />
                      <span>Inspect in HUD</span>
                    </button>
                    <button
                      onClick={() => {
                        onBranchNode(contextMenu.nodeId!);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card transition text-left"
                    >
                      <GitBranch className="w-3.5 h-3.5 text-sky-400" />
                      <span>Branch Parallel Version</span>
                    </button>
                    {project.nodes[contextMenu.nodeId]?.sceneId && (
                      <button
                        onClick={() => {
                          const n = project.nodes[contextMenu.nodeId!];
                          if (n?.sceneId) onSetActiveCut(n.sceneId, n.id);
                          setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card transition text-left"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        <span>Star as Active Cut</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleResyncStale(contextMenu.nodeId!);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card transition text-left"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Re-sync Upstream Prompt</span>
                    </button>
                    <div className="h-[1px] bg-subtle my-1" />
                    <button
                      onClick={() => {
                        handleDeleteNode(contextMenu.nodeId!);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Version...</span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* HANDLE-BASED TREE GROWTH PICKER (Triggered when dragging handle to empty canvas) */}
        {growthPicker && (
          <div
            style={{ left: growthPicker.screenX, top: growthPicker.screenY }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 w-52 bg-surface border border-subtle rounded-2xl shadow-2xl p-2 space-y-1 animate-scale-in text-xs font-mono"
          >
            <div className="text-[10px] font-bold text-text-muted px-2 py-1 uppercase">
              Connect New Stage
            </div>
            <button
              onClick={() => {
                handleAddNode('shot', { x: growthPicker.flowX, y: growthPicker.flowY }, growthPicker.sourceNodeId);
                setGrowthPicker(null);
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
            >
              <Camera className="w-3.5 h-3.5 text-sky-400" />
              <span>Add Shot Optics</span>
            </button>
            <button
              onClick={() => {
                handleAddNode('footage', { x: growthPicker.flowX, y: growthPicker.flowY }, growthPicker.sourceNodeId);
                setGrowthPicker(null);
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
            >
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Video Take</span>
            </button>
            <button
              onClick={() => {
                handleAddNode('script', { x: growthPicker.flowX, y: growthPicker.flowY }, growthPicker.sourceNodeId);
                setGrowthPicker(null);
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Script Beat</span>
            </button>
            <button
              onClick={() => {
                handleAddNode('assets', { x: growthPicker.flowX, y: growthPicker.flowY }, growthPicker.sourceNodeId);
                setGrowthPicker(null);
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
            >
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Add Subject Anchor</span>
            </button>
          </div>
        )}
      </div>

      {/* NODE DELETION CONFIRMATION DIALOG (Studio / System Trash) */}
      {nodeToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => !isDeletingNode && setNodeToDelete(null)}
        >
          <div
            className="w-full max-w-md bg-surface border border-subtle rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Delete Node Version</h3>
                  <p className="text-xs text-text-muted">Choose removal method for DAG & local files</p>
                </div>
              </div>
              <button
                onClick={() => !isDeletingNode && setNodeToDelete(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Node Details Card */}
            <div className="p-3.5 rounded-xl bg-card border border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface border border-subtle text-accent-primary">
                  {nodeToDelete.stage}
                </span>
                <span className="text-[11px] font-mono text-text-muted">
                  {nodeToDelete.versionLabel}
                </span>
              </div>
              <div className="text-xs font-bold text-text-primary truncate">
                {nodeToDelete.title}
              </div>

              {/* Media / File info if present */}
              {(nodeToDelete.artifacts?.mediaUrl ||
                nodeToDelete.artifacts?.audioUrl ||
                nodeToDelete.assetMetadata?.styleReferenceAssetUrl) && (
                <div className="pt-2 border-t border-subtle/60 text-[11px] font-mono text-text-muted space-y-1.5">
                  {nodeToDelete.artifacts?.mediaUrl && (
                    <div className="flex items-center gap-1.5 truncate text-amber-400/90">
                      <Video className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{nodeToDelete.artifacts.mediaUrl}</span>
                    </div>
                  )}
                  {nodeToDelete.artifacts?.audioUrl && (
                    <div className="flex items-center gap-1.5 truncate text-cyan-400/90">
                      <FileAudio className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{nodeToDelete.artifacts.audioUrl}</span>
                    </div>
                  )}
                  {nodeToDelete.assetMetadata?.styleReferenceAssetUrl && (
                    <div className="flex items-center gap-1.5 truncate text-purple-400/90">
                      <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{nodeToDelete.assetMetadata.styleReferenceAssetUrl}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Re-parenting notice */}
            <p className="text-xs text-text-muted leading-relaxed">
              Downstream child nodes in the DAG will be re-connected to this node's parent version automatically.
            </p>

            {/* Action Choices */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleConfirmDeleteNode(true)}
                disabled={isDeletingNode}
                className="w-full p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-left transition flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                    {isDeletingNode ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Delete from System as Well (Move to Trash)</span>
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    Unlinks node and moves associated media/audio files to your Mac Trash.
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleConfirmDeleteNode(false)}
                disabled={isDeletingNode}
                className="w-full p-3 rounded-xl bg-card hover:bg-subtle/50 border border-subtle text-left transition flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-text-muted" />
                    <span>Remove Node from DAG Only</span>
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    Unlinks node and reconnects children. Generated media remains stored on disk.
                  </div>
                </div>
              </button>
            </div>

            {/* Footer Cancel */}
            <div className="flex justify-end pt-2 border-t border-subtle">
              <button
                onClick={() => setNodeToDelete(null)}
                disabled={isDeletingNode}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
