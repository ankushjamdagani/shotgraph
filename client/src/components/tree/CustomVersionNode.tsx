import React from 'react';
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
} from 'lucide-react';

interface CustomVersionNodeProps {
  data: {
    node: VersionNode;
    isActiveCut: boolean;
    isSelected: boolean;
    onSelect: (nodeId: string) => void;
    onBranch: (nodeId: string) => void;
    onSetActiveCut: (sceneId: string, nodeId: string) => void;
    onMediaDrop: (nodeId: string, file: File) => void;
  };
}

export const CustomVersionNode: React.FC<CustomVersionNodeProps> = ({ data }) => {
  const { node, isActiveCut, isSelected, onSelect, onBranch, onSetActiveCut, onMediaDrop } = data;
  const [isDragOver, setIsDragOver] = React.useState(false);

  const getEngineBadge = (engine: string) => {
    switch (engine) {
      case 'antigravity-cli':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/80">
            AGY CLI
          </span>
        );
      case 'claude-cli':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/80">
            Claude CLI
          </span>
        );
      case 'ollama':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            Ollama
          </span>
        );
      case 'hyperframes':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-orange-950/80 text-orange-300 border border-orange-800/80">
            HyperFrames
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-zinc-800 text-zinc-300">
            External
          </span>
        );
    }
  };

  const getStageInfo = (stage: string) => {
    switch (stage) {
      case 'ideation':
        return { label: 'Idea / Premise', icon: <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> };
      case 'taste':
        return { label: 'Taste / STYLE.md', icon: <Palette className="w-3.5 h-3.5 text-pink-400" /> };
      case 'script':
        return { label: 'Master Script', icon: <FileText className="w-3.5 h-3.5 text-blue-400" /> };
      case 'assets':
        return { label: 'Subject Asset', icon: <User className="w-3.5 h-3.5 text-purple-400" /> };
      case 'shot':
      case 'storyboard':
        return { label: 'Shot / Storyboard', icon: <Camera className="w-3.5 h-3.5 text-cyan-400" /> };
      case 'footage':
      case 'motion':
        return { label: 'Video Take', icon: <Video className="w-3.5 h-3.5 text-emerald-400" /> };
      case 'voice':
        return { label: 'Audio Stem', icon: <Music className="w-3.5 h-3.5 text-emerald-400" /> };
      case 'vfx':
        return { label: 'VFX / Overlay', icon: <Wand2 className="w-3.5 h-3.5 text-orange-400" /> };
      case 'assembly':
      case 'render':
        return { label: 'Master Cut', icon: <Film className="w-3.5 h-3.5 text-sky-400" /> };
      default:
        return { label: stage, icon: <Sparkles className="w-3.5 h-3.5 text-slate-400" /> };
    }
  };

  const stageInfo = getStageInfo(node.stage);
  const isMasterAnchor = node.assetMetadata?.isMasterStyleAnchor;

  return (
    <div
      onClick={() => onSelect(node.id)}
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
      className={`w-72 rounded-xl transition-all duration-200 cursor-pointer shadow-xl backdrop-blur-md p-3.5 border ${
        isSelected
          ? 'bg-[#151D30] border-sky-400 ring-2 ring-sky-500/30'
          : isActiveCut
          ? 'bg-[#111726] border-amber-500/70'
          : isMasterAnchor
          ? 'bg-[#181126] border-purple-500/70'
          : 'bg-[#0E131F]/90 border-slate-800 hover:border-slate-700'
      } ${isDragOver ? 'ring-2 ring-emerald-400 bg-emerald-950/40' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-sky-400 !w-2 !h-2" />
      <Handle type="target" position={Position.Top} className="!bg-sky-400 !w-2 !h-2" id="top" />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {stageInfo.icon}
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300 uppercase truncate">
            {stageInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isMasterAnchor && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Star className="w-2.5 h-2.5 fill-purple-300 text-purple-300" />
              ANCHOR
            </span>
          )}
          {isActiveCut && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
              CUT
            </span>
          )}
          {getEngineBadge(node.modelEngine)}
        </div>
      </div>

      {/* Title & Version Label */}
      <div className="mb-2">
        <div className="text-xs font-bold text-white truncate">{node.title}</div>
        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>{node.versionLabel}</span>
          {node.sceneId && <span className="opacity-75">{node.sceneId}</span>}
        </div>
      </div>

      {/* Artifact Thumbnail / Text Preview */}
      {node.artifacts.mediaUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-slate-800 mb-2 h-20 bg-black/60 flex items-center justify-center">
          <img
            src={`http://localhost:3030/media/${node.artifacts.mediaUrl.replace(/^\//, '')}`}
            alt={node.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to text if image fails to load
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-slate-300">
            Media Asset
          </div>
        </div>
      ) : (
        <div className="bg-[#0A0D14]/80 rounded-lg p-2 border border-slate-800/80 mb-2 text-[10px] text-slate-300 font-mono line-clamp-2">
          {node.artifacts.textContent || node.prompt || 'No content generated yet.'}
        </div>
      )}

      {/* Node Footer Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBranch(node.id);
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-sky-400 hover:bg-sky-950/60 transition"
          title="Branch this version into a new parallel generation"
        >
          <GitBranch className="w-3 h-3" />
          Branch
        </button>

        {node.sceneId && !isActiveCut && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (node.sceneId) {
                onSetActiveCut(node.sceneId, node.id);
              }
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-amber-400 hover:bg-amber-950/50 transition"
            title="Set this version as the active cut for this scene"
          >
            <Star className="w-3 h-3" />
            Set Active
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-sky-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-sky-400 !w-2 !h-2" id="bottom" />
    </div>
  );
};
