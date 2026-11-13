import React, { useState } from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Play, Pause, Star, Pin, X, Upload } from 'lucide-react';

interface TakeFloatingHudProps {
  node: VersionNode;
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
  onClose: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const TakeFloatingHud: React.FC<TakeFloatingHudProps> = ({
  node,
  project,
  onUpdateProject,
  onClose,
  isPinned,
  onTogglePin,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const isActiveCut = node.sceneId ? project.activeCut[node.sceneId] === node.id : false;

  const handleMakeActiveCut = async () => {
    if (!node.sceneId) return;
    try {
      const res = await fetch('http://localhost:3030/api/tree/active-cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: node.sceneId,
          nodeId: node.id,
          projectId: project.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdateProject({
          ...project,
          activeCut: {
            ...project.activeCut,
            [node.sceneId]: node.id,
          },
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-84 rounded-2xl bg-[#121215]/95 backdrop-blur-xl border border-emerald-500/80 shadow-2xl p-4 text-[#FAFAFA] space-y-3 z-30 select-none animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold font-mono text-emerald-400">Video Take Review HUD</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
            TAKE-ONE
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`p-1 rounded text-xs transition ${isPinned ? 'text-amber-400 bg-[#27272A]' : 'text-[#71717A] hover:text-white'}`}
              title={isPinned ? 'Unpin HUD' : 'Pin HUD Open'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded text-[#71717A] hover:text-white transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Preview Monitor */}
      <div className="w-full h-36 rounded-xl bg-[#09090B] border border-[#27272A] relative overflow-hidden flex flex-col justify-end p-2.5">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-black/30 to-transparent">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition backdrop-blur-sm"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
        </div>

        {/* Video Scrubber & Timecode */}
        <div className="relative z-10 space-y-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-[#A1A1AA]">
            <span>{isPlaying ? 'PLAYING...' : 'PAUSED'}</span>
            <span>00:00:02:18 / 00:00:05:00</span>
          </div>
          <div className="w-full h-1 bg-[#27272A] rounded-full overflow-hidden">
            <div className="w-1/2 h-full bg-emerald-500"></div>
          </div>
        </div>
      </div>

      {/* Take Metadata & Status */}
      <div className="p-2 rounded-xl bg-[#09090B] border border-[#27272A] text-[10px] font-mono grid grid-cols-2 gap-1.5 text-[#A1A1AA]">
        <div>Engine: <span className="text-white">Runway Gen-3</span></div>
        <div>Duration: <span className="text-white">5.0s</span></div>
        <div>Format: <span className="text-white">4K 24fps</span></div>
        <div>Resolution: <span className="text-white">2160x3840</span></div>
      </div>

      {/* Active Cut Button */}
      <button
        onClick={handleMakeActiveCut}
        className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition font-mono ${
          isActiveCut
            ? 'bg-amber-500 text-black border border-amber-400'
            : 'bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A]'
        }`}
      >
        <Star className={`w-3.5 h-3.5 ${isActiveCut ? 'fill-black' : 'text-amber-400'}`} />
        <span>{isActiveCut ? '⭐ Currently Active Cut (Live Edit)' : 'Star as Active Cut'}</span>
      </button>

      {/* Replacement Dropzone */}
      <div className="p-2.5 rounded-xl border border-dashed border-[#27272A] hover:border-emerald-500/60 bg-[#09090B]/60 text-center cursor-pointer transition">
        <Upload className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
        <div className="text-[10px] font-bold text-slate-300">Drop MP4 Video File to Replace</div>
      </div>
    </div>
  );
};
