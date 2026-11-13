import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { VersionNode } from '../../types.js';
import {
  GitBranch,
  Star,
  Sparkles,
  Video,
  FileText,
  Music,
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
} from 'lucide-react';

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
  } = data;

  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(node.title);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const getStageInfo = (stage: string) => {
    switch (stage) {
      case 'ideation':
        return { label: 'Idea / Premise', icon: <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> };
      case 'taste':
        return { label: 'Taste / STYLE.md', icon: <Palette className="w-3.5 h-3.5 text-pink-400" /> };
      case 'script':
        return { label: 'Master Script', icon: <FileText className="w-3.5 h-3.5 text-sky-400" /> };
      case 'assets':
        return { label: 'Subject Asset', icon: <User className="w-3.5 h-3.5 text-purple-400" /> };
      case 'shot':
      case 'storyboard':
        return { label: 'Shot / Optics', icon: <Camera className="w-3.5 h-3.5 text-amber-400" /> };
      case 'footage':
      case 'motion':
        return { label: 'Video Take', icon: <Video className="w-3.5 h-3.5 text-emerald-400" /> };
      case 'voice':
        return { label: 'Audio Stem', icon: <Music className="w-3.5 h-3.5 text-sky-400" /> };
      case 'vfx':
        return { label: 'VFX / Overlay', icon: <Wand2 className="w-3.5 h-3.5 text-orange-400" /> };
      case 'assembly':
      case 'render':
        return { label: 'Master Cut', icon: <Film className="w-3.5 h-3.5 text-white" /> };
      default:
        return { label: stage, icon: <Sparkles className="w-3.5 h-3.5 text-[#A1A1AA]" /> };
    }
  };

  const getColorTagBorder = (tag?: VersionNode['colorTag']) => {
    switch (tag) {
      case 'white':
        return 'border-[#FAFAFA]';
      case 'blue':
        return 'border-sky-500';
      case 'purple':
        return 'border-purple-500';
      case 'emerald':
        return 'border-emerald-500';
      case 'amber':
        return 'border-amber-500';
      default:
        return isSelected
          ? 'border-[#FAFAFA] ring-2 ring-white/20'
          : isActiveCut
          ? 'border-amber-500/80'
          : isHudOpen
          ? 'border-sky-400 ring-2 ring-sky-500/30'
          : 'border-[#27272A] hover:border-[#3F3F46]';
    }
  };

  const handleCommitRename = () => {
    if (titleDraft.trim() && titleDraft !== node.title && onRename) {
      onRename(node.id, titleDraft.trim());
    }
    setIsEditingTitle(false);
  };

  const stageInfo = getStageInfo(node.stage);
  const isMasterAnchor = node.assetMetadata?.isMasterStyleAnchor;

  return (
    <div
      onClick={() => {
        onSelect(node.id);
        if (onToggleHud) onToggleHud(node.id);
      }}
      onDoubleClick={() => onToggleHud && onToggleHud(node.id)}
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
      className={`group relative w-72 rounded-2xl bg-[#121215] transition-all duration-150 cursor-pointer shadow-2xl p-3.5 border ${getColorTagBorder(
        node.colorTag
      )} ${isDragOver ? 'ring-2 ring-emerald-500 bg-emerald-950/20' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[#E4E4E7] !w-2 !h-2" />
      <Handle type="target" position={Position.Top} className="!bg-[#E4E4E7] !w-2 !h-2" id="top" />

      {/* ON-NODE HOVER QUICK ACTION TOOLBAR */}
      <div className="absolute -top-4 right-2 hidden group-hover:flex items-center gap-1 bg-[#18181B] px-1.5 py-0.5 rounded-lg border border-[#27272A] shadow-xl z-20 animate-in fade-in duration-100">
        {/* Toggle Floating In-Place HUD */}
        {onToggleHud && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHud(node.id);
            }}
            className="p-1 rounded text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition"
            title="Open in-place floating HUD"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}

        {/* Set Active Cut */}
        {node.sceneId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (node.sceneId) onSetActiveCut(node.sceneId, node.id);
            }}
            className={`p-1 rounded transition ${
              isActiveCut ? 'text-amber-400 bg-amber-950/50' : 'text-[#A1A1AA] hover:text-amber-400 hover:bg-[#27272A]'
            }`}
            title="Star as Active Cut"
          >
            <Star className={`w-3 h-3 ${isActiveCut ? 'fill-amber-400' : ''}`} />
          </button>
        )}

        {/* Color Tag Picker Toggle */}
        {onColorTag && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="p-1 rounded text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition"
              title="Set Color Tag"
            >
              <Tag className="w-3 h-3" />
            </button>
            {showColorPicker && (
              <div className="absolute top-6 left-0 flex items-center gap-1 bg-[#121215] p-1.5 rounded-lg border border-[#27272A] shadow-2xl z-30">
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
                        ? 'bg-[#27272A]'
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

        {/* Inline Rename */}
        {onRename && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingTitle(true);
            }}
            className="p-1 rounded text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition"
            title="Rename version"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}

        {/* Branch Version */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBranch(node.id);
          }}
          className="p-1 rounded text-[#A1A1AA] hover:text-sky-400 hover:bg-[#27272A] transition"
          title="Branch this version"
        >
          <GitBranch className="w-3 h-3" />
        </button>

        {/* Delete Node */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete node "${node.title}"? Downstream edges will automatically re-link.`)) {
                onDelete(node.id);
              }
            }}
            className="p-1 rounded text-[#A1A1AA] hover:text-red-400 hover:bg-[#27272A] transition"
            title="Delete node (auto-relink edges)"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {stageInfo.icon}
          <span className="text-[10px] font-mono font-bold tracking-wider text-[#A1A1AA] uppercase truncate">
            {stageInfo.label}
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
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-white text-black">
              HUD
            </span>
          )}
        </div>
      </div>

      {/* Title & Version Label */}
      <div className="mb-2">
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
              className="w-full p-1 rounded bg-[#09090B] border border-sky-500 text-xs text-white font-mono focus:outline-none"
            />
            <button
              onClick={handleCommitRename}
              className="p-1 rounded bg-sky-500 text-black hover:bg-sky-400"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="text-xs font-bold text-white truncate">{node.title}</div>
        )}
        <div className="text-[10px] font-mono text-[#71717A] flex items-center justify-between mt-0.5">
          <span>{node.versionLabel}</span>
          {node.sceneId && <span className="opacity-75">{node.sceneId}</span>}
        </div>
      </div>

      {/* Artifact Thumbnail / Text Preview */}
      {node.artifacts?.mediaUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-[#27272A] mb-2 h-20 bg-black/60 flex items-center justify-center">
          <img
            src={`http://localhost:3030/media/${node.artifacts.mediaUrl.replace(/^\//, '')}`}
            alt={node.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-[#A1A1AA]">
            Media Asset
          </div>
        </div>
      ) : (
        <div className="bg-[#09090B] rounded-lg p-2 border border-[#27272A] mb-2 text-[10px] text-[#A1A1AA] font-mono line-clamp-2 leading-relaxed">
          {node.artifacts?.textContent || node.prompt || 'No content generated yet.'}
        </div>
      )}

      {/* Footer Details */}
      <div className="flex items-center justify-between pt-1 border-t border-[#27272A] text-[10px] font-mono text-[#71717A]">
        <span>Click to edit HUD</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleHud && onToggleHud(node.id);
          }}
          className="text-white font-bold hover:underline"
        >
          {isHudOpen ? 'Close HUD ✕' : 'Edit ↗'}
        </button>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[#E4E4E7] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#E4E4E7] !w-2 !h-2" id="bottom" />
    </div>
  );
};
