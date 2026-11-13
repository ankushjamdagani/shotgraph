import React, { useState } from 'react';
import { Handle, Position, NodeResizeControl, ResizeControlVariant } from '@xyflow/react';
import { VersionNode } from '../../types.js';
import {
  GitBranch,
  Star,
  Video,
  FileText,
  Camera,
  User,
  Lightbulb,
  Palette,
  Film,
  Wand2,
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
} from 'lucide-react';

const NEXT_STAGE_MAP: Record<string, Array<{ stage: string; label: string; icon: string }>> = {
  ideation: [{ stage: 'script', label: 'Script Beat', icon: '📝' }],
  taste: [{ stage: 'script', label: 'Script Beat', icon: '📝' }],
  script: [
    { stage: 'assets', label: 'Character Asset', icon: '👤' },
    { stage: 'shot', label: 'Shot Framing', icon: '🎥' },
  ],
  assets: [{ stage: 'shot', label: 'Shot Framing', icon: '🎥' }],
  shot: [{ stage: 'footage', label: 'Video Take', icon: '🎬' }],
  storyboard: [{ stage: 'footage', label: 'Video Take', icon: '🎬' }],
  footage: [{ stage: 'vfx', label: 'VFX / Motion', icon: '✨' }],
  motion: [{ stage: 'vfx', label: 'VFX / Motion', icon: '✨' }],
  vfx: [{ stage: 'assembly', label: 'Active Cut', icon: '🎞️' }],
  assembly: [{ stage: 'render', label: 'Final Master', icon: '🚀' }],
};

interface CustomVersionNodeProps {
  data: {
    node: VersionNode;
    isActiveCut: boolean;
    isSelected: boolean;
    isHudOpen?: boolean;
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

export const CustomVersionNode: React.FC<CustomVersionNodeProps> = ({ data }) => {
  const {
    node,
    isActiveCut,
    isSelected,
    isHudOpen,
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

  // Stage Design Configurations (Silhouettes & Accents)
  const getStageDesign = (stage: string) => {
    switch (stage) {
      case 'ideation':
        return {
          label: 'Idea / Premise',
          bannerBg: 'bg-amber-500/10 dark:bg-amber-950/40 text-amber-500 dark:text-amber-200 border-amber-500/30',
          accentColor: '#F59E0B',
          icon: <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
        };
      case 'taste':
        return {
          label: 'Taste DNA',
          bannerBg: 'bg-rose-500/10 dark:bg-rose-950/40 text-rose-500 dark:text-rose-200 border-rose-500/30',
          accentColor: '#F43F5E',
          icon: <Palette className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
        };
      case 'script':
        return {
          label: 'Screenplay Beat',
          bannerBg: 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-200 border-emerald-500/30',
          accentColor: '#10B981',
          icon: <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
        };
      case 'assets':
        return {
          label: 'Subject Anchor',
          bannerBg: 'bg-purple-500/10 dark:bg-purple-950/40 text-purple-600 dark:text-purple-200 border-purple-500/30',
          accentColor: '#8B5CF6',
          icon: <User className="w-3.5 h-3.5 text-purple-500 shrink-0" />,
        };
      case 'shot':
      case 'storyboard':
        return {
          label: 'Shot & Optics',
          bannerBg: 'bg-sky-500/10 dark:bg-sky-950/40 text-sky-600 dark:text-sky-200 border-sky-500/30',
          accentColor: '#06B6D4',
          icon: <Camera className="w-3.5 h-3.5 text-sky-500 shrink-0" />,
        };
      case 'footage':
      case 'motion':
        return {
          label: 'Video Take',
          bannerBg: 'bg-amber-500/15 dark:bg-amber-950/50 text-amber-600 dark:text-amber-200 border-amber-500/30',
          accentColor: '#EAB308',
          icon: <Video className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
        };
      case 'vfx':
        return {
          label: 'VFX / Overlay',
          bannerBg: 'bg-fuchsia-500/10 dark:bg-fuchsia-950/40 text-fuchsia-600 dark:text-fuchsia-200 border-fuchsia-500/30',
          accentColor: '#D946EF',
          icon: <Wand2 className="w-3.5 h-3.5 text-fuchsia-500 shrink-0" />,
        };
      case 'assembly':
      case 'render':
        return {
          label: 'Master Cut',
          bannerBg: 'bg-text-primary/10 text-text-primary border-subtle',
          accentColor: '#FAFAFA',
          icon: <Film className="w-3.5 h-3.5 text-text-primary shrink-0" />,
        };
      default:
        return {
          label: stage,
          bannerBg: 'bg-card text-text-muted border-subtle',
          accentColor: '#A1A1AA',
          icon: <Film className="w-3.5 h-3.5 text-text-muted shrink-0" />,
        };
    }
  };

  const getColorTagBorder = (tag?: VersionNode['colorTag']) => {
    switch (tag) {
      case 'white':
        return 'border-[#FAFAFA] ring-1 ring-white/50';
      case 'blue':
        return 'border-sky-500 ring-1 ring-sky-500/50';
      case 'purple':
        return 'border-purple-500 ring-1 ring-purple-500/50';
      case 'emerald':
        return 'border-emerald-500 ring-1 ring-emerald-500/50';
      case 'amber':
        return 'border-amber-500 ring-1 ring-amber-500/50';
      default:
        return isSelected
          ? 'border-accent-primary ring-2 ring-accent-primary/30 shadow-2xl scale-[1.01]'
          : isActiveCut
          ? 'border-amber-500/90 shadow-amber-500/10 shadow-lg'
          : isHudOpen
          ? 'border-sky-400 ring-2 ring-sky-500/30'
          : 'border-subtle hover:border-text-muted/60';
    }
  };

  const handleCommitRename = () => {
    if (titleDraft.trim() && titleDraft !== node.title && onRename) {
      onRename(node.id, titleDraft.trim());
    }
    setIsEditingTitle(false);
  };

  const stage = getStageDesign(node.stage);
  const isMasterAnchor = node.assetMetadata?.isMasterStyleAnchor;

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
      className={`group relative rounded-2xl bg-surface transition-shadow duration-150 cursor-pointer shadow-xl border overflow-hidden ${getColorTagBorder(
        node.colorTag
      )} ${isDragOver ? 'ring-2 ring-emerald-500 bg-emerald-950/20' : ''}`}
    >
      {isSelected && (
        <>
          <NodeResizeControl
            position="right"
            variant={ResizeControlVariant.Line}
            minWidth={280}
            maxWidth={640}
            className="!border-r-2 !border-dashed !border-accent-primary"
            onResize={(_e, params) => {
              if (onResize) onResize(node.id, params.width);
            }}
          />
          <NodeResizeControl
            position="left"
            variant={ResizeControlVariant.Line}
            minWidth={280}
            maxWidth={640}
            className="!border-l-2 !border-dashed !border-accent-primary"
            onResize={(_e, params) => {
              if (onResize) onResize(node.id, params.width);
            }}
          />
        </>
      )}

      <Handle type="target" position={Position.Left} className="!bg-accent-primary !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Top} className="!bg-accent-primary !w-2.5 !h-2.5" id="top" />

      {/* ON-NODE HOVER QUICK ACTION TOOLBAR */}
      <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 bg-card/95 backdrop-blur-md px-1.5 py-0.5 rounded-xl border border-subtle shadow-xl z-20 animate-in fade-in duration-100">
        {onToggleHud && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHud(node.id);
            }}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition"
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
            className={`p-1 rounded-lg transition ${
              isActiveCut ? 'text-amber-400 bg-amber-500/20' : 'text-text-muted hover:text-amber-400 hover:bg-subtle'
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
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition"
              title="Set Color Tag"
            >
              <Tag className="w-3 h-3" />
            </button>
            {showColorPicker && (
              <div className="absolute top-7 right-0 flex items-center gap-1.5 bg-surface p-1.5 rounded-xl border border-subtle shadow-2xl z-30">
                {(['default', 'white', 'blue', 'purple', 'emerald', 'amber'] as const).map((color) => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation();
                      onColorTag(node.id, color);
                      setShowColorPicker(false);
                    }}
                    className={`w-3 h-3 rounded-full border border-black/40 ${
                      color === 'default'
                        ? 'bg-subtle'
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
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition"
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
          className="p-1 rounded-lg text-text-muted hover:text-sky-400 hover:bg-subtle transition"
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
            className="p-1 rounded-lg text-text-muted hover:text-red-400 hover:bg-subtle transition"
            title="Delete node"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* DISTINCT STAGE HEADER BANNER */}
      <div className={`px-3 py-1.5 border-b flex items-center justify-between ${stage.bannerBg}`}>
        <div className="flex items-center gap-1.5">
          {stage.icon}
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase truncate">
            {stage.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isMasterAnchor && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Star className="w-2.5 h-2.5 fill-purple-300 text-purple-300" />
              ANCHOR
            </span>
          )}
          {isActiveCut && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
              CUT
            </span>
          )}
          {isHudOpen && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-accent-primary text-app">
              HUD
            </span>
          )}
        </div>
      </div>

      {/* SOFT INVALIDATION (STALE FLAGGING) WARNING BAR */}
      {node.isStale && (
        <div className="px-3 py-1 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between text-[10px] text-amber-300 font-mono">
          <div className="flex items-center gap-1 truncate">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">{node.staleReason || 'Upstream ancestor modified'}</span>
          </div>
          {onResyncStale && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResyncStale(node.id);
              }}
              className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400 hover:underline shrink-0"
              title="Re-sync contextual prompt"
            >
              <RotateCw className="w-2.5 h-2.5" />
              <span>Re-sync</span>
            </button>
          )}
        </div>
      )}

      {/* NODE BODY CONTENT */}
      <div className="p-3.5 space-y-2.5">
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
                className="w-full p-1 rounded-lg bg-card border border-accent-primary text-xs text-text-primary font-mono focus:outline-none"
              />
              <button
                onClick={handleCommitRename}
                className="p-1 rounded-lg bg-accent-primary text-app hover:opacity-90"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="text-xs font-bold text-text-primary truncate">{node.title}</div>
          )}
          <div className="text-[10px] font-mono text-text-muted flex items-center justify-between mt-0.5">
            <span>{node.versionLabel}</span>
            {node.sceneId && <span className="opacity-75">{node.sceneId}</span>}
          </div>
        </div>

        {/* BESPOKE CONTENT BASED ON STAGE */}
        {/* 1. Asset Anchor: Prominent character/product portrait */}
        {node.stage === 'assets' && (
          <div className="relative rounded-xl overflow-hidden border border-purple-500/30 h-28 bg-app flex items-center justify-center">
            {node.artifacts?.mediaUrl || node.assetMetadata?.styleReferenceAssetUrl ? (
              <img
                src={`http://localhost:3030/media/${(
                  node.artifacts?.mediaUrl || node.assetMetadata?.styleReferenceAssetUrl || ''
                ).replace(/^\//, '')}`}
                alt={node.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-purple-400/60 gap-1 text-[10px] font-mono">
                <User className="w-6 h-6 text-purple-400/40" />
                <span>Style Anchor Portrait</span>
              </div>
            )}
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/80 text-[9px] font-mono text-purple-300">
              {node.assetMetadata?.turnaroundAngle || 'Portrait'}
            </div>
          </div>
        )}

        {/* 2. Footage Take: Video Monitor Slate */}
        {(node.stage === 'footage' || node.stage === 'motion') && (
          <div className="relative rounded-xl overflow-hidden border border-amber-500/30 h-24 bg-black flex items-center justify-center">
            {node.artifacts?.mediaUrl ? (
              <video
                src={`http://localhost:3030/media/${node.artifacts.mediaUrl.replace(/^\//, '')}`}
                className="w-full h-full object-cover opacity-85"
                muted
                loop
                playsInline
                onMouseOver={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-amber-400/60 gap-1 text-[10px] font-mono">
                <Play className="w-5 h-5 text-amber-400/40 ml-0.5" />
                <span>Rendered Clip Slate</span>
              </div>
            )}
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono text-amber-300 uppercase">
              {node.modelEngine}
            </div>
            {node.artifacts?.mediaUrl && (
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono text-text-muted">
                Hover to Play
              </div>
            )}
          </div>
        )}

        {/* 3. Script Beat: Screenplay Beat Card */}
        {node.stage === 'script' && (
          <div className="p-2.5 rounded-xl bg-card border border-emerald-500/20 text-xs font-mono text-text-muted space-y-1.5">
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Dialogue Beat</span>
              {node.artifacts?.audioUrl && <Volume2 className="w-3 h-3 text-emerald-400" />}
            </div>
            <div className="line-clamp-2 leading-relaxed italic text-text-primary text-[11px]">
              "{node.artifacts?.textContent || node.prompt || 'Dialogue text line...'}"
            </div>
          </div>
        )}

        {/* 4. Shot Optics: Lens Specs & Camera Motion */}
        {(node.stage === 'shot' || node.stage === 'storyboard') && (
          <div className="p-2 rounded-xl bg-card border border-sky-500/20 text-[10px] font-mono text-text-muted grid grid-cols-2 gap-1.5">
            <div className="bg-surface p-1 rounded-lg border border-subtle">
              <span className="opacity-60 block">Lens</span>
              <span className="text-sky-400 font-bold truncate block">
                {node.shotContextOverrides?.lensFocalLength || '35mm Prime'}
              </span>
            </div>
            <div className="bg-surface p-1 rounded-lg border border-subtle">
              <span className="opacity-60 block">Motion</span>
              <span className="text-text-primary font-bold truncate block">
                {node.shotContextOverrides?.cameraMovement || 'Slow Push-In'}
              </span>
            </div>
          </div>
        )}

        {/* Fallback Text excerpt for Ideation/Taste/VFX */}
        {['ideation', 'taste', 'vfx', 'assembly', 'render'].includes(node.stage) && (
          <div className="bg-card rounded-xl p-2 border border-subtle text-[10px] text-text-muted font-mono line-clamp-2 leading-relaxed">
            {node.artifacts?.textContent || node.prompt || 'Awaiting generation...'}
          </div>
        )}

        {/* Footer Details */}
        <div className="flex items-center justify-between pt-1 border-t border-subtle text-[10px] font-mono text-text-muted">
          <span>{node.modelEngine}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHud && onToggleHud(node.id);
            }}
            className="text-text-primary font-bold hover:underline"
          >
            {isHudOpen ? 'Close HUD ✕' : 'Inspect HUD ↗'}
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[#E4E4E7] !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#E4E4E7] !w-2.5 !h-2.5" id="bottom" />

      {/* CONTEXTUAL AUTO-ADD NEXT STAGE BADGE ON HOVER */}
      {isHovered && nextStages && nextStages.length > 0 && (
        <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-30 flex items-center animate-in fade-in zoom-in-95 duration-100">
          {nextStages.length === 1 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onAutoAddNextStage) onAutoAddNextStage(node.id, nextStages[0].stage);
              }}
              className="px-2 py-0.5 rounded-full bg-accent-primary text-app font-bold text-[9px] shadow-lg flex items-center gap-1 hover:scale-105 transition font-mono border border-surface cursor-pointer"
              title={`Auto-Add Next Stage: ${nextStages[0].label}`}
            >
              <Plus className="w-2.5 h-2.5" />
              <span>{nextStages[0].label}</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNextStagePicker(!showNextStagePicker);
                }}
                className="w-5 h-5 rounded-full bg-accent-primary text-app font-bold text-[10px] shadow-lg flex items-center justify-center hover:scale-105 transition font-mono border border-surface cursor-pointer"
                title="Auto-Add Next Stage"
              >
                <Plus className="w-3 h-3" />
              </button>
              {showNextStagePicker && (
                <div className="absolute left-6 top-1/2 -translate-y-1/2 w-40 bg-surface border border-subtle rounded-xl shadow-2xl p-1 z-40 space-y-0.5 animate-scale-in">
                  <div className="text-[9px] font-mono text-text-muted px-2 py-0.5 uppercase font-bold">
                    Add Next Stage
                  </div>
                  {nextStages.map((nxt) => (
                    <button
                      key={nxt.stage}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNextStagePicker(false);
                        if (onAutoAddNextStage) onAutoAddNextStage(node.id, nxt.stage);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-semibold text-text-primary hover:bg-card hover:text-accent-primary transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{nxt.icon}</span>
                      <span>{nxt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
