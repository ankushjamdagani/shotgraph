import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { VersionNode } from '../../types.js';
import { GitBranch, Star, Sparkles, Video, FileText, Music } from 'lucide-react';

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
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">Antigravity CLI</span>;
      case 'claude-cli':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800">Claude CLI</span>;
      case 'ollama':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">Ollama</span>;
      case 'hyperframes':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-950 text-orange-300 border border-orange-800">HyperFrames</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300">External</span>;
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'script':
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case 'voice':
        return <Music className="w-3.5 h-3.5 text-emerald-400" />;
      case 'motion':
      case 'render':
        return <Video className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

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
      className={`w-72 rounded-xl transition-all duration-200 cursor-pointer shadow-lg backdrop-blur-md p-3.5 border ${
        isSelected
          ? 'bg-[#151D30] border-sky-400 ring-2 ring-sky-500/30'
          : isActiveCut
          ? 'bg-[#111726] border-amber-500/60'
          : 'bg-[#0E131F]/90 border-slate-800 hover:border-slate-700'
      } ${isDragOver ? 'ring-2 ring-emerald-400 bg-emerald-950/40' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-sky-400" />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {getStageIcon(node.stage)}
          <span className="text-[11px] font-semibold tracking-wide text-slate-300 uppercase">
            {node.stage}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isActiveCut && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
              ACTIVE CUT
            </span>
          )}
          {getEngineBadge(node.modelEngine)}
        </div>
      </div>

      {/* Title & Version Label */}
      <div className="mb-2">
        <div className="text-xs font-bold text-slate-100 truncate">{node.title}</div>
        <div className="text-[11px] font-medium text-slate-400">{node.versionLabel}</div>
      </div>

      {/* Artifact Preview */}
      <div className="bg-[#0A0D14]/80 rounded-lg p-2 border border-slate-800/80 mb-3 text-[11px] text-slate-300 font-mono line-clamp-2">
        {node.artifacts.textContent || node.prompt || 'No content generated yet.'}
      </div>

      {/* Node Footer Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBranch(node.id);
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-sky-400 hover:bg-sky-950/60 transition"
          title="Branch this version into a new parallel generation"
        >
          <GitBranch className="w-3 h-3" />
          Branch
        </button>

        {!isActiveCut && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetActiveCut(node.sceneId, node.id);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-amber-400 hover:bg-amber-950/50 transition"
            title="Set this version as the active cut for this scene"
          >
            <Star className="w-3 h-3" />
            Set Active
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-sky-400" />
    </div>
  );
};
