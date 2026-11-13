import React from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Film, Wand2, Pin, X } from 'lucide-react';

interface CompositionFloatingHudProps {
  node: VersionNode;
  project: FilmProject;
  onUpdateProject?: (updated: FilmProject) => void;
  onClose: () => void;
  onOpenDaVinciExport?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const CompositionFloatingHud: React.FC<CompositionFloatingHudProps> = ({
  project,
  onClose,
  onOpenDaVinciExport,
  isPinned,
  onTogglePin,
}) => {
  const totalDuration = project.scenes.reduce((acc, s) => acc + s.targetDurationSec, 0);

  return (
    <div className="w-88 rounded-2xl bg-[#121215]/95 backdrop-blur-xl border border-sky-500/80 shadow-2xl p-4 text-[#FAFAFA] space-y-3.5 z-30 select-none animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold font-mono text-sky-400">Composition & Timeline HUD</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono font-bold">
            NLE
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

      {/* Multi-Track Channel Strips */}
      <div className="space-y-1.5 text-[10px] font-mono">
        <div className="text-[10px] font-mono uppercase text-[#71717A]">Active Multi-Track Stack</div>

        {/* Track V2 Overlay */}
        <div className="p-2 rounded-xl bg-orange-950/30 border border-orange-500/50 flex items-center justify-between text-orange-200">
          <div className="flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-bold">Track V2: Alpha Overlays</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-900/60 font-mono">ProRes 4444</span>
        </div>

        {/* Track V1 Footage */}
        <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/50 flex items-center justify-between text-emerald-200">
          <div className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">Track V1: Video Footage Cuts</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900/60 font-mono">{project.fps} FPS</span>
        </div>

        {/* Track A1 Dialogue */}
        <div className="p-2 rounded-xl bg-sky-950/30 border border-sky-500/50 flex items-center justify-between text-sky-200">
          <span>Track A1: Dialogue & Kokoro Voiceover</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-900/60 font-mono">-15 LUFS</span>
        </div>

        {/* Track A2 Audio / SFX */}
        <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-500/50 flex items-center justify-between text-purple-200">
          <span>Track A2: Procedural Foley & Ambience (Earshot)</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-900/60 font-mono">Duck 12dB</span>
        </div>
      </div>

      {/* Assembly Stats */}
      <div className="p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] text-[10px] font-mono grid grid-cols-2 gap-1.5 text-[#A1A1AA]">
        <div>Target: <span className="text-white">{totalDuration}s Total</span></div>
        <div>Aspect: <span className="text-white">{project.aspectRatio}</span></div>
        <div>Scenes: <span className="text-white">{project.scenes.length} Scenes</span></div>
        <div>Audio: <span className="text-white">48kHz 24-bit</span></div>
      </div>

      {/* Export DaVinci Resolve Button */}
      <button
        onClick={onOpenDaVinciExport}
        className="w-full py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition font-mono"
      >
        <Film className="w-4 h-4 fill-black" />
        <span>Export DaVinci Resolve Bundle 🚀</span>
      </button>
    </div>
  );
};
