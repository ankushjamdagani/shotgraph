import React, { useState } from 'react';
import { Handle, Position, NodeResizeControl, ResizeControlVariant } from '@xyflow/react';
import { VersionNode } from '../../types.js';
import { PORT_COLOR_MAP, getDefaultPortsForType } from '../../utils/graphTopology.js';
import {
  GitBranch,
  Star,
  FileText,
  Camera,
  User,
  Lightbulb,
  Sliders,
  Film,
  Sparkles,
  Trash2,
  Tag,
  Edit2,
  Check,
  Maximize2,
  AlertTriangle,
  RotateCw,
  Play,
  Volume2,
  Plus,
  Clapperboard,
  Rocket,
  Layers,
} from 'lucide-react';

interface NextStageOption {
  stage: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NEXT_STAGE_MAP: Record<string, NextStageOption[]> = {
  ideation: [{ stage: 'script', label: 'Script Beat', icon: FileText }],
  taste: [{ stage: 'script', label: 'Script Beat', icon: FileText }],
  script: [
    { stage: 'assets', label: 'Subject Anchor', icon: User },
    { stage: 'shot', label: 'Shot Framing', icon: Camera },
  ],
  assets: [{ stage: 'shot', label: 'Shot Framing', icon: Camera }],
  shot: [{ stage: 'footage', label: 'Video Take', icon: Clapperboard }],
  storyboard: [{ stage: 'footage', label: 'Video Take', icon: Clapperboard }],
  footage: [{ stage: 'vfx', label: 'VFX / Motion', icon: Sparkles }],
  motion: [{ stage: 'vfx', label: 'VFX / Motion', icon: Sparkles }],
  vfx: [{ stage: 'assembly', label: 'Active Cut', icon: Layers }],
  assembly: [{ stage: 'render', label: 'Final Master', icon: Rocket }],
};

interface CustomVersionNodeProps {
  data: {
    node: VersionNode;
    projectId: string;
    isActiveCut: boolean;
    isSelected: boolean;
    isHudOpen?: boolean;
    isDimmed?: boolean;
    onSelect: (nodeId: string) => void;
    onToggleHud?: (nodeId: string) => void;
    onBranch: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    onRename?: (nodeId: string, newTitle: string) => void;
    onColorTag?: (nodeId: string, color: VersionNode['colorTag']) => void;
    onSetActiveCut: (sceneId: string, nodeId: string) => void;
    onMediaDrop: (nodeId: string, file: File) => void;
    onResyncStale?: (nodeId: string) => void;
    onResize?: (nodeId: string, width: number) => void;
    onAutoAddNextStage?: (nodeId: string, nextStage: string) => void;
  };
}

const CustomVersionNodeComponent: React.FC<CustomVersionNodeProps> = ({ data }) => {
  const {
    node,
    isActiveCut,
    isSelected,
    isHudOpen,
    isDimmed,
    onSelect,
    onToggleHud,
    onBranch,
    onDelete,
    onRename,
    onColorTag,
    onSetActiveCut,
    onMediaDrop,
    onResyncStale,
    onResize,
    onAutoAddNextStage,
  } = data;

  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(node.title);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showNextStagePicker, setShowNextStagePicker] = useState(false);

  const nextStages = NEXT_STAGE_MAP[node.stage];

  // Stage Design Configurations (Unified Dark Graphite Chassis + Subtle Semantic Icons)
  const getStageDesign = (stage: string) => {
    switch (stage) {
      case 'ideation':
        return {
          label: 'Ideation / Premise',
          icon: <Lightbulb className="w-3.5 h-3.5 text-text-muted shrink-0" />,
        };
      case 'taste':
        return {
          label: 'Taste DNA',
          icon: <Sliders className="w-3.5 h-3.5 text-text-muted shrink-0" />,
        };
      case 'script':
        return {
          label: 'Screenplay Beat',
          icon: <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />,
        };
      case 'assets':
        return {
          label: 'Subject Anchor',
          icon: <User className="w-3.5 h-3.5 text-text-muted shrink-0" />,
        };
      case 'shot':
      case 'storyboard':
        return {
          label: 'Shot & Optics',
          icon: <Camera className="w-3.5 h-3.5 text-text-muted shrink-0" />,
        };
      case 'footage':
      case 'motion':
        return {
          label: 'Video Take',
          icon: <Clapperboard className="w-3.5 h-3.5 text-text-muted shrink-0" />,
        };
      case 'vfx':
        return {
          label: 'VFX / Motion',
          icon: <Sparkles className="w-3.5 h-3.5 text-text-muted shrink-0" />,
        };
      case 'assembly':
      case 'render':
        return {
          label: 'Master Cut',
          icon: <Film className="w-3.5 h-3.5 text-text-muted shrink-0" />,
        };
      default:
        return {
          label: stage.toUpperCase(),
          icon: <Film className="w-3.5 h-3.5 text-text-muted shrink-0" />,
        };
    }
  };

  const getNodeBorderState = (tag?: VersionNode['colorTag']) => {
    if (tag && tag !== 'default') {
      switch (tag) {
        case 'white':
          return 'border-zinc-200 ring-1 ring-white/30';
        case 'blue':
          return 'border-sky-400/80 ring-1 ring-sky-400/30';
        case 'purple':
          return 'border-purple-400/80 ring-1 ring-purple-400/30';
        case 'emerald':
          return 'border-emerald-400/80 ring-1 ring-emerald-400/30';
        case 'amber':
          return 'border-amber-400/80 ring-1 ring-amber-400/30';
      }
    }

    if (isSelected) {
      return 'border-white ring-1 ring-white/40 shadow-2xl scale-[1.01]';
    }

    if (isActiveCut) {
      return 'border-amber-400/90 shadow-[0_0_24px_-4px_rgba(251,191,36,0.22)] ring-1 ring-amber-400/40';
    }

    if (isHudOpen) {
      return 'border-zinc-400 ring-1 ring-white/20';
    }

    return 'border-subtle hover:border-zinc-500/80 shadow-xl shadow-black/40';
  };

  const handleCommitRename = () => {
    if (titleDraft.trim() && titleDraft !== node.title && onRename) {
      onRename(node.id, titleDraft.trim());
    }
    setIsEditingTitle(false);
  };

  const stage = getStageDesign(node.stage);
  const isMasterAnchor = node.assetMetadata?.isMasterStyleAnchor;

  const defaultPorts = getDefaultPortsForType(node.type || node.stage);
  const inputPortList = Object.values(node.inputPorts || defaultPorts.inputPorts);
  const outputPortList = Object.values(node.outputPorts || defaultPorts.outputPorts);

  return (
    <div
      style={{ width: node.width || 320 }}
      onClick={() => {
        onSelect(node.id);
        if (onToggleHud) onToggleHud(node.id);
      }}
      onDoubleClick={() => onToggleHud && onToggleHud(node.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowNextStagePicker(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          onMediaDrop(node.id, e.dataTransfer.files[0]);
        }
      }}
      className={`group relative rounded bg-surface transition-all duration-150 cursor-pointer border overflow-hidden ${
        isDimmed ? 'opacity-35 hover:opacity-95' : 'opacity-100'
      } ${getNodeBorderState(node.colorTag)} ${
        isDragOver ? 'ring-2 ring-emerald-400/80 bg-emerald-950/20' : ''
      }`}
    >
      {isSelected && (
        <>
          <NodeResizeControl
            position="right"
            variant={ResizeControlVariant.Line}
            minWidth={280}
            maxWidth={640}
            className="!border-r !border-subtle hover:!border-subtle"
            onResize={(_e, params) => {
              if (onResize) onResize(node.id, params.width);
            }}
          />
          <NodeResizeControl
            position="left"
            variant={ResizeControlVariant.Line}
            minWidth={280}
            maxWidth={640}
            className="!border-l !border-subtle hover:!border-subtle"
            onResize={(_e, params) => {
              if (onResize) onResize(node.id, params.width);
            }}
          />
        </>
      )}

      {/* Typed Input Ports on Left */}
      {inputPortList.length > 0 ? (
        inputPortList.map((port, idx) => {
          const topPercent =
            inputPortList.length === 1
              ? 50
              : 20 + (idx * 60) / (inputPortList.length - 1);
          const color = PORT_COLOR_MAP[port.type] || '#A1A1AA';
          return (
            <div key={port.id} className="group/port">
              <Handle
                type="target"
                position={Position.Left}
                id={port.id}
                style={{ top: `${topPercent}%`, backgroundColor: color }}
                className="!w-2.5 !h-2.5 !border !border-black transition-transform hover:!scale-150 !z-30 after:absolute after:-inset-2 after:content-[''] cursor-crosshair"
              />
              <span
                style={{ top: `${topPercent}%` }}
                className="absolute left-3.5 -translate-y-1/2 hidden group-hover/port:inline-block z-50 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap bg-surface border border-subtle text-text-primary shadow-xl pointer-events-none"
              >
                {port.name}
              </span>
            </div>
          );
        })
      ) : (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-zinc-400 hover:!bg-white !w-2.5 !h-2.5 !border !border-black transition-colors"
        />
      )}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-zinc-400 hover:!bg-white !w-2.5 !h-2.5 !border !border-black transition-colors"
        id="top"
      />

      {/* ON-NODE HOVER QUICK ACTION TOOLBAR */}
      <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-0.5 bg-card backdrop-blur-md p-1 rounded-lg border border-subtle shadow-2xl z-20 animate-in fade-in duration-100">
        {onToggleHud && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHud(node.id);
            }}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-white/[0.08] active:scale-90 transition-all cursor-pointer"
            title="Open in-place floating HUD"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}

        {node.sceneId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (node.sceneId) onSetActiveCut(node.sceneId, node.id);
            }}
            className={`p-1 rounded active:scale-90 transition-all cursor-pointer ${
              isActiveCut
                ? 'text-amber-400 bg-amber-400/20'
                : 'text-text-muted hover:text-amber-400 hover:bg-white/[0.08]'
            }`}
            title="Set as Active Cut"
          >
            <Star className={`w-3 h-3 ${isActiveCut ? 'fill-amber-400' : ''}`} />
          </button>
        )}

        {onColorTag && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-white/[0.08] active:scale-90 transition-all cursor-pointer"
              title="Set Color Tag"
            >
              <Tag className="w-3 h-3" />
            </button>
            {showColorPicker && (
              <div className="absolute top-8 right-0 flex items-center gap-1.5 bg-card p-1.5 rounded-lg border border-subtle shadow-2xl z-30">
                {(['default', 'white', 'blue', 'purple', 'emerald', 'amber'] as const).map((color) => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation();
                      onColorTag(node.id, color);
                      setShowColorPicker(false);
                    }}
                    className={`w-3 h-3 rounded-full border border-black/50 transition-transform hover:scale-125 active:scale-95 cursor-pointer ${
                      color === 'default'
                        ? 'bg-zinc-600'
                        : color === 'white'
                        ? 'bg-white'
                        : color === 'blue'
                        ? 'bg-sky-400'
                        : color === 'purple'
                        ? 'bg-purple-400'
                        : color === 'emerald'
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {onRename && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingTitle(true);
            }}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-white/[0.08] active:scale-90 transition-all cursor-pointer"
            title="Rename node"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onBranch(node.id);
          }}
          className="p-1 rounded text-text-muted hover:text-sky-400 hover:bg-white/[0.08] active:scale-90 transition-all cursor-pointer"
          title="Branch this version"
        >
          <GitBranch className="w-3 h-3" />
        </button>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="p-1 rounded text-text-muted hover:text-rose-400 hover:bg-white/[0.08] active:scale-90 transition-all cursor-pointer"
            title="Delete node"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* DISCIPLINED GRAPHITE STAGE HEADER */}
      <div className="px-3 py-1.5 bg-card border-b border-subtle flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {stage.icon}
          <span className="text-[10px] font-mono font-medium tracking-[0.14em] uppercase text-text-primary truncate">
            {stage.label}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {isMasterAnchor && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider uppercase bg-purple-500/10 text-purple-300 border border-purple-500/30">
              <Star className="w-2.5 h-2.5 fill-purple-300 text-purple-300" />
              ANCHOR
            </span>
          )}
          {isActiveCut && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider uppercase bg-amber-400/15 text-amber-300 border border-amber-400/30 shadow-[0_0_8px_rgba(251,191,36,0.15)]">
              <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
              CUT
            </span>
          )}
          {isHudOpen && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider uppercase bg-card text-text-primary border border-subtle">
              HUD
            </span>
          )}
        </div>
      </div>

      {/* SOFT INVALIDATION (STALE FLAGGING) WARNING BAR */}
      {node.isStale && (
        <div className="px-3 py-1 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[10px] text-amber-300 font-mono">
          <div className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">{node.staleReason || 'Upstream ancestor modified'}</span>
          </div>
          {onResyncStale && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResyncStale(node.id);
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[9px] font-bold text-amber-200 transition active:scale-95 shrink-0 cursor-pointer"
              title="Re-sync contextual prompt"
            >
              <RotateCw className="w-2.5 h-2.5" />
              <span>Re-sync</span>
            </button>
          )}
        </div>
      )}

      {/* NODE BODY CONTENT */}
      <div className="p-3 space-y-2.5">
        {/* Title & Version Slug */}
        <div>
          {isEditingTitle ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitRename();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                autoFocus
                className="w-full px-2 py-1 rounded bg-card border border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-subtle"
              />
              <button
                onClick={handleCommitRename}
                className="p-1 rounded bg-white text-black hover:bg-zinc-200 active:scale-95 transition cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="text-xs font-semibold text-text-primary truncate tracking-tight">{node.title}</div>
          )}
          <div className="text-[10px] font-mono text-text-muted flex items-center justify-between mt-1">
            <span className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-subtle text-text-primary tracking-wider">
              {node.versionLabel}
            </span>
            {node.sceneId && (
              <span className="text-text-muted tracking-widest text-[9px] uppercase font-mono">
                {node.sceneId}
              </span>
            )}
          </div>
        </div>

        {/* BESPOKE CONTENT BASED ON STAGE */}
        {/* 1. Asset Anchor: Precision Studio Portrait Monitor */}
        {node.stage === 'assets' && (
          <div className="relative rounded-lg overflow-hidden border border-subtle h-32 bg-card flex items-center justify-center group/monitor">
            {/* Corner Reticles */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-subtle" />
              <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-subtle" />
              <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-subtle" />
              <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-subtle" />
            </div>

            {node.artifacts?.mediaUrl || node.assetMetadata?.styleReferenceAssetUrl ? (
              <img
                src={`/api/projects/${data.projectId}/media/${(
                  node.artifacts?.mediaUrl || node.assetMetadata?.styleReferenceAssetUrl || ''
                ).replace(/^\//, '')}`}
                alt={node.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-text-muted gap-1.5 text-[9px] font-mono uppercase tracking-widest">
                <div className="w-7 h-7 rounded bg-white/[0.03] border border-subtle flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-text-muted stroke-[1.5]" />
                </div>
                <span className="text-[9px] text-text-muted font-medium">Style Anchor</span>
              </div>
            )}

            {/* Precision Telemetry Overlays */}
            <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider text-text-primary border border-subtle uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400/90 shrink-0 shadow-[0_0_4px_rgba(192,132,252,0.5)]" />
              <span>ANCHOR</span>
            </div>

            <div className="absolute bottom-1.5 right-1.5 z-10 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-mono text-text-primary border border-subtle uppercase">
              {node.assetMetadata?.turnaroundAngle || 'Portrait'}
            </div>
          </div>
        )}

        {/* 2. Footage Take: Precision Letterboxed Video Monitor */}
        {(node.stage === 'footage' || node.stage === 'motion') && (
          <div className="relative rounded-lg overflow-hidden border border-subtle h-28 bg-card flex items-center justify-center group/monitor">
            {/* Framing Guides & Letterbox Corner Reticles */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-subtle" />
              <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-subtle" />
              <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-subtle" />
              <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-subtle" />
            </div>

            {node.artifacts?.mediaUrl ? (
              <video
                src={`/api/projects/${data.projectId}/media/${node.artifacts.mediaUrl.replace(/^\//, '')}`}
                className="w-full h-full object-cover transition-opacity duration-200"
                muted
                loop
                playsInline
                onMouseOver={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-text-muted gap-1.5 text-[9px] font-mono uppercase tracking-widest">
                <div className="w-7 h-7 rounded bg-white/[0.03] border border-subtle flex items-center justify-center">
                  <Clapperboard className="w-3.5 h-3.5 text-text-muted stroke-[1.5]" />
                </div>
                <span className="text-[9px] text-text-muted font-medium">Awaiting Take</span>
              </div>
            )}

            {/* Precision Telemetry Overlays */}
            <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider text-text-primary border border-subtle uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/90 shrink-0 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
              <span>{node.modelEngine}</span>
            </div>

            <div className="absolute top-1.5 right-1.5 z-10 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-mono tabular-nums text-text-muted border border-subtle">
              24 FPS
            </div>

            {node.artifacts?.mediaUrl && (
              <div className="absolute bottom-1.5 right-1.5 z-10 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-mono text-text-muted border border-subtle opacity-0 group-hover/monitor:opacity-100 transition-opacity duration-150 flex items-center gap-1">
                <Play className="w-2 h-2 fill-zinc-400 text-text-muted" />
                <span>PLAY</span>
              </div>
            )}
          </div>
        )}

        {/* 3. Script Beat: Screenplay Beat Card */}
        {node.stage === 'script' && (
          <div className="p-2.5 rounded-lg bg-card border border-subtle text-xs font-mono space-y-1.5">
            <div className="text-[9px] font-mono font-medium tracking-[0.12em] uppercase text-text-muted flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-text-muted" />
                <span>Dialogue Beat</span>
              </span>
              {node.artifacts?.audioUrl && (
                <span className="flex items-center gap-1 text-[8px] text-text-muted bg-white/[0.05] px-1 py-0.5 rounded border border-subtle">
                  <Volume2 className="w-2.5 h-2.5 text-text-muted" />
                  <span>STEM</span>
                </span>
              )}
            </div>
            <div className="line-clamp-2 leading-relaxed italic text-text-primary text-[11px] border-l-2 border-zinc-700/80 pl-2">
              "{node.artifacts?.textContent || node.prompt || 'Dialogue text line...'}"
            </div>
          </div>
        )}

        {/* 4. Shot Optics: Lens Specs & Camera Motion */}
        {(node.stage === 'shot' || node.stage === 'storyboard') && (
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
            <div className="bg-card p-2 rounded-lg border border-subtle">
              <span className="text-[8px] font-mono uppercase tracking-widest text-text-muted block">Lens</span>
              <span className="text-text-primary font-semibold truncate block mt-0.5">
                {node.shotContextOverrides?.lensFocalLength || '35mm Prime'}
              </span>
            </div>
            <div className="bg-card p-2 rounded-lg border border-subtle">
              <span className="text-[8px] font-mono uppercase tracking-widest text-text-muted block">Motion</span>
              <span className="text-text-primary font-semibold truncate block mt-0.5">
                {node.shotContextOverrides?.cameraMovement || 'Slow Push-In'}
              </span>
            </div>
          </div>
        )}

        {/* Fallback Text excerpt for Ideation/Taste/VFX */}
        {['ideation', 'taste', 'vfx', 'assembly', 'render'].includes(node.stage) && (
          <div className="bg-card rounded-lg p-2.5 border border-subtle text-[10px] text-text-primary font-mono line-clamp-2 leading-relaxed">
            {node.artifacts?.textContent || node.prompt || 'Awaiting generation prompt...'}
          </div>
        )}

        {/* Footer Details */}
        <div className="flex items-center justify-between pt-2 border-t border-subtle text-[9px] font-mono text-text-muted">
          <span className="uppercase tracking-wider">{node.modelEngine}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHud && onToggleHud(node.id);
            }}
            className="text-text-muted hover:text-text-primary font-medium transition active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <span>{isHudOpen ? 'CLOSE HUD' : 'INSPECT HUD'}</span>
            <span className="text-[10px]">{isHudOpen ? '✕' : '↗'}</span>
          </button>
        </div>
      </div>

      {/* Typed Output Ports on Right */}
      {outputPortList.length > 0 ? (
        outputPortList.map((port, idx) => {
          const topPercent =
            outputPortList.length === 1
              ? 50
              : 20 + (idx * 60) / (outputPortList.length - 1);
          const color = PORT_COLOR_MAP[port.type] || '#A1A1AA';
          return (
            <div key={port.id} className="group/port">
              <Handle
                type="source"
                position={Position.Right}
                id={port.id}
                style={{ top: `${topPercent}%`, backgroundColor: color }}
                className="!w-2.5 !h-2.5 !border !border-black transition-transform hover:!scale-150 !z-30 after:absolute after:-inset-2 after:content-[''] cursor-crosshair"
              />
              <span
                style={{ top: `${topPercent}%` }}
                className="absolute right-3.5 -translate-y-1/2 hidden group-hover/port:inline-block z-50 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap bg-surface border border-subtle text-text-primary shadow-xl pointer-events-none"
              >
                {port.name}
              </span>
            </div>
          );
        })
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-zinc-400 hover:!bg-white !w-2.5 !h-2.5 !border !border-black transition-colors"
        />
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-zinc-400 hover:!bg-white !w-2.5 !h-2.5 !border !border-black transition-colors"
        id="bottom"
      />

      {/* CONTEXTUAL AUTO-ADD NEXT STAGE BADGE ON HOVER */}
      {isHovered && nextStages && nextStages.length > 0 && (
        <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-30 flex items-center animate-in fade-in zoom-in-95 duration-100">
          {nextStages.length === 1 ? (
            (() => {
              const NextIcon = nextStages[0].icon;
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAutoAddNextStage) onAutoAddNextStage(node.id, nextStages[0].stage);
                  }}
                  className="px-2.5 py-1 rounded-md bg-card hover:bg-card active:scale-95 text-text-primary hover:text-text-primary font-medium text-[9px] font-mono tracking-wider uppercase shadow-2xl flex items-center gap-1.5 border border-subtle transition-all cursor-pointer"
                  title={`Auto-Add Next Stage: ${nextStages[0].label}`}
                >
                  <Plus className="w-2.5 h-2.5 text-text-muted" />
                  <NextIcon className="w-3 h-3 text-text-primary" />
                  <span>{nextStages[0].label}</span>
                </button>
              );
            })()
          ) : (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNextStagePicker(!showNextStagePicker);
                }}
                className="w-6 h-6 rounded-md bg-card hover:bg-card active:scale-95 text-text-primary hover:text-text-primary font-medium text-[10px] font-mono shadow-2xl flex items-center justify-center border border-subtle transition-all cursor-pointer"
                title="Auto-Add Next Stage"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {showNextStagePicker && (
                <div className="absolute left-7 top-1/2 -translate-y-1/2 w-44 bg-card border border-subtle rounded-lg shadow-2xl p-1 z-40 space-y-0.5 animate-scale-in">
                  <div className="text-[8px] font-mono text-text-muted px-2 py-1 uppercase tracking-widest font-semibold border-b border-subtle">
                    Add Next Stage
                  </div>
                  {nextStages.map((nxt) => {
                    const NextIcon = nxt.icon;
                    return (
                      <button
                        key={nxt.stage}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNextStagePicker(false);
                          if (onAutoAddNextStage) onAutoAddNextStage(node.id, nxt.stage);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded text-[10px] font-mono tracking-wide text-text-primary hover:bg-white/[0.08] hover:text-text-primary transition flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <NextIcon className="w-3 h-3 text-text-muted shrink-0" />
                        <span className="truncate">{nxt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CustomVersionNode = React.memo(CustomVersionNodeComponent, (prev, next) => {
  return (
    prev.data.node.id === next.data.node.id &&
    prev.data.node.versionLabel === next.data.node.versionLabel &&
    prev.data.node.title === next.data.node.title &&
    prev.data.node.prompt === next.data.node.prompt &&
    prev.data.node.status === next.data.node.status &&
    prev.data.node.isDirty === next.data.node.isDirty &&
    prev.data.node.position?.x === next.data.node.position?.x &&
    prev.data.node.position?.y === next.data.node.position?.y &&
    prev.data.node.width === next.data.node.width &&
    prev.data.isSelected === next.data.isSelected &&
    prev.data.isActiveCut === next.data.isActiveCut &&
    prev.data.isHudOpen === next.data.isHudOpen &&
    prev.data.isDimmed === next.data.isDimmed &&
    prev.data.node.artifacts === next.data.node.artifacts &&
    prev.data.node.metadata === next.data.node.metadata
  );
});
